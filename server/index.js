// Servidor do pagamento MB WAY.
// Fala com a API MB WAY v2 da ifthenpay e guarda a chave fora do browser.
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import settings from '../src/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10kb' }));

const PORT = Number(process.env.PORT) || 3001;
const MOCK = String(process.env.MBWAY_MOCK ?? 'true').toLowerCase() !== 'false';
const MBWAY_KEY = process.env.MBWAY_KEY || '';
const API_URL = process.env.MBWAY_API_URL || 'https://api.ifthenpay.com/spg/payment/mbway';
const STATUS_URL =
  process.env.MBWAY_STATUS_URL || 'https://api.ifthenpay.com/spg/payment/mbway/status';
const CALLBACK_KEY = process.env.MBWAY_CALLBACK_KEY || '';

if (!MOCK && !MBWAY_KEY) {
  console.error('⚠  MBWAY_MOCK=false mas falta MBWAY_KEY no .env');
  process.exit(1);
}

// Pedidos em memória (para produção com vários servidores, usar uma base de dados)
const pedidos = new Map(); // requestId → { orderId, valor, criadoEm, estado }
const pagosPorCallback = new Set(); // requestIds confirmados via callback

// Limite simples: 5 pedidos por minuto por IP
const tentativas = new Map();
function limiteExcedido(ip) {
  const agora = Date.now();
  const lista = (tentativas.get(ip) || []).filter((t) => agora - t < 60_000);
  lista.push(agora);
  tentativas.set(ip, lista);
  return lista.length > 5;
}

function novoOrderId() {
  // ifthenpay: máximo 15 caracteres
  return ('CT' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'))
    .toUpperCase()
    .slice(0, 15);
}

function traduzirEstado(status) {
  switch (String(status)) {
    case '000': return 'pago';
    case '020':
    case '122': return 'recusado';
    case '101': return 'expirado';
    default: return 'pendente';
  }
}

// ── POST /api/mbway/pedido ─────────────────────────────────
app.post('/api/mbway/pedido', async (req, res) => {
  if (limiteExcedido(req.ip)) {
    return res.status(429).json({ erro: 'Demasiados pedidos. Aguarde um minuto.' });
  }

  const telemovel = String(req.body?.telemovel || '').replace(/\D/g, '').replace(/^351(?=\d{9}$)/, '');
  const valor = Number(req.body?.valor);

  if (!/^9[1236]\d{7}$/.test(telemovel)) {
    return res.status(400).json({ erro: 'Número de telemóvel inválido.' });
  }
  if (!Number.isFinite(valor) || valor < settings.valorMinimo || valor > settings.valorMaximo) {
    return res.status(400).json({ erro: 'Valor inválido.' });
  }

  const orderId = novoOrderId();
  const amount = valor.toFixed(2);

  if (MOCK) {
    const requestId = 'DEMO-' + crypto.randomUUID();
    pedidos.set(requestId, { orderId, valor: amount, criadoEm: Date.now(), estado: 'pendente' });
    console.log(`[demo] Pedido ${orderId} de €${amount} para ${telemovel} → ${settings.nomeLoja}`);
    return res.json({ requestId, orderId, demo: true });
  }

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mbWayKey: MBWAY_KEY,
        orderId,
        amount,
        mobileNumber: telemovel,
        description: `${settings.nomeLoja} ${orderId}`.slice(0, 100)
      })
    });
    const dados = await r.json().catch(() => ({}));

    if (String(dados.Status) !== '000' || !dados.RequestId) {
      console.warn('MB WAY recusou o pedido:', dados);
      const msg =
        String(dados.Status) === '122'
          ? 'O pedido foi recusado.'
          : 'Não foi possível enviar o pedido MB WAY. Confirme o número e tente de novo.';
      return res.status(502).json({ erro: msg });
    }

    pedidos.set(dados.RequestId, { orderId, valor: amount, criadoEm: Date.now(), estado: 'pendente' });
    return res.json({ requestId: dados.RequestId, orderId });
  } catch (err) {
    console.error('Erro ao contactar a ifthenpay:', err);
    return res.status(502).json({ erro: 'Serviço de pagamento indisponível. Tente mais tarde.' });
  }
});

// ── GET /api/mbway/estado/:requestId ───────────────────────
app.get('/api/mbway/estado/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const pedido = pedidos.get(requestId);
  if (!pedido) return res.status(404).json({ erro: 'Pedido desconhecido.' });

  if (pedido.estado !== 'pendente') return res.json({ estado: pedido.estado });

  const idadeSeg = (Date.now() - pedido.criadoEm) / 1000;

  if (MOCK) {
    // Demonstração: o "cliente" aceita ao fim de 8 segundos
    if (idadeSeg > 8) pedido.estado = 'pago';
    return res.json({ estado: pedido.estado });
  }

  if (pagosPorCallback.has(requestId)) {
    pedido.estado = 'pago';
    return res.json({ estado: 'pago' });
  }

  try {
    const url = `${STATUS_URL}?mbWayKey=${encodeURIComponent(MBWAY_KEY)}&requestId=${encodeURIComponent(requestId)}`;
    const r = await fetch(url);
    const dados = await r.json().catch(() => ({}));
    let estado = traduzirEstado(dados.Status);
    if (estado === 'pendente' && idadeSeg > settings.tempoConfirmacao + 30) estado = 'expirado';
    pedido.estado = estado;
    return res.json({ estado });
  } catch (err) {
    console.error('Erro ao consultar estado:', err);
    return res.json({ estado: 'pendente' });
  }
});

// ── Callback da ifthenpay (opcional) ───────────────────────
// Configure no backoffice: https://SEU-DOMINIO/api/mbway/callback?key=[ANTI_PHISHING_KEY]&orderId=[ORDER_ID]&amount=[AMOUNT]&requestId=[REQUEST_ID]&payment_datetime=[PAYMENT_DATETIME]
app.get('/api/mbway/callback', (req, res) => {
  if (!CALLBACK_KEY || req.query.key !== CALLBACK_KEY) return res.sendStatus(403);
  const { requestId, orderId, amount } = req.query;
  if (requestId) pagosPorCallback.add(String(requestId));
  console.log(`✔ Pagamento confirmado: ${orderId} €${amount}`);
  res.sendStatus(200);
});

// ── Site (depois de "npm run build") ───────────────────────
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Servidor MB WAY em http://localhost:${PORT} ${MOCK ? '(modo demonstração)' : ''}`);
});
