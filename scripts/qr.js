// Gera um QR code para abrir o ecrã de pagamento no telemóvel.
//
//   npm run qr                                      → usa o site publicado
//   npm run qr -- http://192.168.1.20:5173         → usa este endereço
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const URL_PUBLICA = 'https://comtradicoes.vercel.app/';
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const url = process.argv[2] || URL_PUBLICA;
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
  console.log('  ⚠ Este QR só funciona no próprio computador.\n');
}
