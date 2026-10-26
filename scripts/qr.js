// Gera um QR code para abrir o ecrã de pagamento no telemóvel durante os testes.
//
//   npm run qr                      → usa o IP do computador na rede Wi-Fi
//   npm run qr -- http://192.168.1.20:5173   → usa este endereço
//
// Nota: "localhost" no telemóvel aponta para o próprio telemóvel, por isso o QR
// usa o IP do computador. Telemóvel e computador têm de estar na mesma rede Wi-Fi.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const PORTA = 5173; // porta do Vite (vite.config.js)
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function ipDaRede() {
  const candidatos = [];
  for (const [nome, lista] of Object.entries(os.networkInterfaces())) {
    for (const i of lista || []) {
      if (i.family === 'IPv4' && !i.internal) candidatos.push({ nome, ip: i.address });
    }
  }
  // Prefere endereços de rede doméstica (192.168.x.x / 10.x.x.x)
  const preferido =
    candidatos.find((c) => c.ip.startsWith('192.168.')) ||
    candidatos.find((c) => c.ip.startsWith('10.')) ||
    candidatos[0];
  return preferido?.ip;
}

const url = process.argv[2] || (ipDaRede() ? `http://${ipDaRede()}:${PORTA}/` : `http://localhost:${PORTA}/`);
const ficheiro = path.join(raiz, 'qr-code.png');

await QRCode.toFile(ficheiro, url, {
  width: 600,
  margin: 2,
  color: { dark: '#2A1C14', light: '#FFFFFF' }
});

console.log('\n  Leia este QR code com o telemóvel para abrir o ecrã de pagamento:\n');
console.log(await QRCode.toString(url, { type: 'terminal', small: true }));
console.log(`  Endereço: ${url}`);
console.log(`  Imagem guardada em: ${ficheiro}\n`);
if (url.includes('localhost')) {
  console.log('  ⚠ Não foi encontrado o IP da rede — este QR só funciona no próprio computador.\n');
}
