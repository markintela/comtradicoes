# Com Tradições — Pagar a conta (MB WAY)

Ecrã único em React para pagar com MB WAY: o cliente indica o valor e o número dele, e recebe o pedido de pagamento na app MB WAY.

## 1. Testar no computador e no telemóvel

É preciso ter o [Node.js 18 ou mais recente](https://nodejs.org).

```bash
npm install
cp .env.example .env        # no Windows: copy .env.example .env
npm run dev
```

Ao arrancar, o `npm run dev` mostra um **QR code no terminal** e guarda-o também em `qr-code.png`. Por padrão, o QR abre o site publicado:
https://comtradicoes-nhqb15775-markintela182-1880s-projects.vercel.app/

- **No computador:** abra http://localhost:5173
- **No telemóvel:** leia o QR code com a câmara para abrir o site publicado.

Para testar a versão local no telemóvel, o computador e o telemóvel têm de estar na mesma rede Wi-Fi. Gere o QR usando o IP local do computador:

```bash
npm run qr -- http://192.168.1.20:5173
```

Para gerar só o QR code publicado:

```bash
npm run qr
```

Para gerar a versão em SVG para download:

```bash
npm run qr:svg
```

Pode indicar qualquer outro endereço depois de `npm run qr --`.

No modo de demonstração (`MBWAY_MOCK=true`), o pedido é simulado e aparece como pago ao fim de 8 segundos. Nada é cobrado.

## 2. Definições da loja: `src/settings.js`

| Variável | Para que serve |
|---|---|
| `mbwayNumber` | **O seu número MB WAY** (o da loja), mostrado como destino do pagamento |
| `nomeLoja`, `subtitulo` | Textos do topo |
| `corPrincipal` | Cor principal (castanho-café) |
| `valorMinimo`, `valorMaximo` | Valores aceites, em euros |
| `tempoConfirmacao` | Segundos que o cliente tem para confirmar (4 min) |

## 3. Ligar o MB WAY real (ifthenpay)

1. Peça a adesão ao MB WAY na ifthenpay. Vai receber uma **chave MB WAY**.
2. No `.env`, preencha `MBWAY_MOCK=false` e `MBWAY_KEY=A-SUA-CHAVE`.
3. Confirme com a ifthenpay os endereços `MBWAY_API_URL` e `MBWAY_STATUS_URL`.
4. Opcional: ative o callback da ifthenpay para `/api/mbway/callback`, com a chave em `MBWAY_CALLBACK_KEY`.

A chave fica só no servidor e nunca chega ao browser.

## 4. Publicar

```bash
npm run build
npm start          # site + API em http://localhost:3001
```

## Estrutura

```
scripts/qr.js           gera o QR code do site publicado
server/index.js         API: envia o pedido MB WAY e consulta o estado
src/settings.js         definições da loja
src/pages/Pagamento.jsx ecrã "Pagar a conta"
src/lib/                chamadas à API e validações
src/styles.css
```
