import { useEffect, useRef, useState } from 'react';
import settings from '../settings.js';
import { enviarPedidoMbway, consultarEstado } from '../lib/api.js';
import {
  parseValor,
  formatEuro,
  limparTelemovel,
  telemovelValido,
  formatTelemovel,
  formatTempo
} from '../lib/format.js';

const INTERVALO_CONSULTA = 3000; // ms

export default function Pagamento() {
  // etapa: 'form' | 'enviando' | 'aguardar' | 'pago' | 'recusado' | 'expirado' | 'erro'
  const [etapa, setEtapa] = useState('form');
  const [valorTxt, setValorTxt] = useState('');
  const [telTxt, setTelTxt] = useState('');
  const [tocado, setTocado] = useState({ valor: false, tel: false });
  const [erro, setErro] = useState('');
  const [pedido, setPedido] = useState(null); // { requestId, orderId }
  const [restante, setRestante] = useState(settings.tempoConfirmacao);
  const timers = useRef([]);

  const valor = parseValor(valorTxt);
  const valorOk =
    !Number.isNaN(valor) && valor >= settings.valorMinimo && valor <= settings.valorMaximo;
  const telOk = telemovelValido(telTxt);
  const podeEnviar = valorOk && telOk;

  const limparTimers = () => {
    timers.current.forEach((t) => clearInterval(t));
    timers.current = [];
  };
  useEffect(() => limparTimers, []);

  // Enquanto aguarda: contagem decrescente + consulta periódica do estado
  useEffect(() => {
    if (etapa !== 'aguardar' || !pedido) return;
    const inicio = Date.now();
    const relogio = setInterval(() => {
      const r = settings.tempoConfirmacao - (Date.now() - inicio) / 1000;
      setRestante(r);
      if (r <= 0) {
        limparTimers();
        setEtapa('expirado');
      }
    }, 1000);
    const consulta = setInterval(async () => {
      try {
        const { estado } = await consultarEstado(pedido.requestId);
        if (estado && estado !== 'pendente') {
          limparTimers();
          setEtapa(estado === 'erro' ? 'erro' : estado);
          if (estado === 'erro') setErro('O pagamento não pôde ser concluído.');
        }
      } catch {
        /* falha momentânea de rede: tenta de novo no próximo ciclo */
      }
    }, INTERVALO_CONSULTA);
    timers.current.push(relogio, consulta);
    return limparTimers;
  }, [etapa, pedido]);

  async function enviar(e) {
    e.preventDefault();
    setTocado({ valor: true, tel: true });
    if (!podeEnviar) return;
    setErro('');
    setEtapa('enviando');
    try {
      const res = await enviarPedidoMbway({
        valor: valor.toFixed(2),
        telemovel: limparTelemovel(telTxt)
      });
      setPedido(res);
      setRestante(settings.tempoConfirmacao);
      setEtapa('aguardar');
    } catch (err) {
      setErro(err.message);
      setEtapa('form');
    }
  }

  function recomecar() {
    limparTimers();
    setPedido(null);
    setErro('');
    setValorTxt('');
    setTocado({ valor: false, tel: false });
    setEtapa('form');
  }

  const erroValor = tocado.valor && valorTxt && !valorOk;
  const erroTel = tocado.tel && telTxt && !telOk;

  return (
    <div className="app">
      <header className="topo">
        <img className="marca" src="/logo-com-tradicoes.svg" alt={settings.nomeLoja} width="240" height="63" />
        <span className="subtitulo">{settings.subtitulo}</span>
      </header>

      <main className="conteudo">
        {etapa === 'form' && (
          <>
            <form className="cartao" onSubmit={enviar} noValidate>
              <div className="cabecalho">
                <span className="selo">MB WAY</span>
                <h1>Pagar a conta</h1>
                <p className="texto-suave">
                  Indique o valor e o seu número. Vai receber o pedido de pagamento na app MB WAY.
                </p>
              </div>

              <div className="campo">
                <label htmlFor="valor">Valor a pagar</label>
                <div className={`entrada entrada-grande ${erroValor ? 'invalida' : valorOk ? 'valida' : ''}`}>
                  <span className="prefixo-euro">€</span>
                  <input
                    id="valor"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,00"
                    value={valorTxt}
                    onChange={(e) => setValorTxt(e.target.value.replace(/[^\d.,]/g, '').slice(0, 8))}
                    onBlur={() => setTocado((t) => ({ ...t, valor: true }))}
                    aria-invalid={erroValor ? 'true' : 'false'}
                    aria-describedby={erroValor ? 'erro-valor' : undefined}
                  />
                </div>
                {erroValor && (
                  <span id="erro-valor" className="erro-campo" role="alert">
                    Introduza um valor entre {formatEuro(settings.valorMinimo)} e{' '}
                    {formatEuro(settings.valorMaximo)}.
                  </span>
                )}
              </div>

              <div className="campo">
                <label htmlFor="tel">O seu número MB WAY</label>
                <div className={`entrada ${erroTel ? 'invalida' : telOk ? 'valida' : ''}`}>
                  <span className="prefixo-tel">+351</span>
                  <input
                    id="tel"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="912 345 678"
                    value={telTxt}
                    onChange={(e) => setTelTxt(e.target.value.replace(/[^\d\s+]/g, '').slice(0, 16))}
                    onBlur={() => setTocado((t) => ({ ...t, tel: true }))}
                    aria-invalid={erroTel ? 'true' : 'false'}
                    aria-describedby={erroTel ? 'erro-tel' : undefined}
                  />
                </div>
                {erroTel && (
                  <span id="erro-tel" className="erro-campo" role="alert">
                    Introduza um número de telemóvel português com 9 dígitos.
                  </span>
                )}
              </div>

              <div className="destino">
                <IconeTelemovel />
                <div>
                  <span className="rotulo">Pagamento para</span>
                  <strong>
                    {settings.nomeLoja} · {formatTelemovel(settings.mbwayNumber)}
                  </strong>
                </div>
              </div>

              {erro && (
                <div className="aviso-erro" role="alert">
                  {erro}
                </div>
              )}

              <button type="submit" className="botao-principal" disabled={!podeEnviar}>
                <IconeEnviar />
                Enviar pedido de pagamento
              </button>
            </form>
            <p className="nota">O pagamento só fica concluído depois de ser confirmado na app MB WAY.</p>
          </>
        )}

        {etapa === 'enviando' && (
          <section className="cartao centrado" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <h1>A enviar pedido…</h1>
            <p className="texto-suave">{formatEuro(valor)} para {settings.nomeLoja}</p>
          </section>
        )}

        {etapa === 'aguardar' && (
          <section className="cartao centrado" aria-live="polite">
            <div className="circulo">
              <IconeTelemovel tamanho={34} />
            </div>
            <h1>Confirme na app MB WAY</h1>
            <p className="texto-suave">
              Enviámos o pedido para {formatTelemovel(telTxt)}. Abra a app MB WAY e aceite o
              pagamento.
            </p>
            <Resumo valor={valor} />
            <div className="contador">
              <span className="spinner pequeno" aria-hidden="true" />
              À espera da confirmação · {formatTempo(restante)}
            </div>
            <button type="button" className="botao-secundario" onClick={recomecar}>
              Cancelar
            </button>
          </section>
        )}

        {etapa === 'pago' && (
          <section className="cartao centrado" aria-live="polite">
            <div className="circulo sucesso">
              <IconeCheck />
            </div>
            <h1>Pagamento confirmado</h1>
            <p className="texto-suave">Obrigado pela visita. Volte sempre!</p>
            <Resumo valor={valor} />
            <button type="button" className="botao-secundario" onClick={recomecar}>
              Fazer novo pagamento
            </button>
          </section>
        )}

        {['recusado', 'expirado', 'erro'].includes(etapa) && (
          <section className="cartao centrado" aria-live="polite">
            <div className="circulo falha">
              <IconeX />
            </div>
            <h1>
              {etapa === 'recusado' && 'Pagamento recusado'}
              {etapa === 'expirado' && 'O pedido expirou'}
              {etapa === 'erro' && 'Algo correu mal'}
            </h1>
            <p className="texto-suave">
              {etapa === 'recusado' && 'O pedido foi recusado na app MB WAY.'}
              {etapa === 'expirado' && 'O tempo para confirmar terminou.'}
              {etapa === 'erro' && (erro || 'Não foi possível concluir o pagamento.')} Pode tentar
              de novo.
            </p>
            <button type="button" className="botao-principal" onClick={() => setEtapa('form')}>
              Tentar novamente
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function Resumo({ valor }) {
  return (
    <dl className="resumo">
      <div>
        <dt>Valor</dt>
        <dd>{formatEuro(valor)}</dd>
      </div>
      <div>
        <dt>Para</dt>
        <dd>{settings.nomeLoja}</dd>
      </div>
    </dl>
  );
}

function IconeTelemovel({ tamanho = 22 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  );
}

function IconeEnviar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}

function IconeCheck() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17 19 7.5" />
    </svg>
  );
}

function IconeX() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
