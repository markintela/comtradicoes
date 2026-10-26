import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const URL_PUBLICA = 'https://comtradicoes-nhqb15775-markintela182-1880s-projects.vercel.app/';
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ficheiro = path.join(raiz, 'qr-code.svg');

await QRCode.toFile(ficheiro, URL_PUBLICA, {
  type: 'svg',
  width: 600,
  margin: 2,
  color: { dark: '#2A1C14', light: '#FFFFFF' }
});

console.log(`SVG gerado em: ${ficheiro}`);
console.log(`Endereço: ${URL_PUBLICA}`);
