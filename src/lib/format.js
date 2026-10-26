// Converte "4,50" / "4.5" em número; devolve NaN se inválido
export function parseValor(texto) {
  const t = String(texto || '').trim().replace(/\s/g, '');
  if (!/^\d+([.,]\d{1,2})?$/.test(t)) return NaN;
  return parseFloat(t.replace(',', '.'));
}

export function formatEuro(valor) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);
}

// Só dígitos; aceita "+351 912 345 678" e devolve "912345678"
export function limparTelemovel(texto) {
  let d = String(texto || '').replace(/\D/g, '');
  if (d.length > 9 && d.startsWith('351')) d = d.slice(3);
  return d;
}

export function telemovelValido(numero) {
  return /^9[1236]\d{7}$/.test(limparTelemovel(numero));
}

export function formatTelemovel(numero) {
  const d = limparTelemovel(numero);
  if (d.length !== 9) return numero;
  return `+351 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function formatTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
