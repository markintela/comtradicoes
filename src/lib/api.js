async function pedidoJSON(url, opcoes) {
  const res = await fetch(url, opcoes);
  let dados = null;
  try {
    dados = await res.json();
  } catch {
    /* resposta sem JSON */
  }
  if (!res.ok) {
    throw new Error(dados?.erro || 'Não foi possível contactar o serviço de pagamento.');
  }
  return dados;
}

// Envia o pedido MB WAY → { requestId, orderId }
export function enviarPedidoMbway({ valor, telemovel }) {
  return pedidoJSON('/api/mbway/pedido', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor, telemovel })
  });
}

// Consulta o estado → { estado: 'pendente' | 'pago' | 'recusado' | 'expirado' | 'erro' }
export function consultarEstado(requestId) {
  return pedidoJSON(`/api/mbway/estado/${encodeURIComponent(requestId)}`);
}
