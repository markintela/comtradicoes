# Com Tradições — Pagar a conta (MB WAY)

Ecrã único em React para pagar com MB WAY: o cliente indica o valor e o número dele, e recebe o pedido de pagamento na app MB WAY.

## 1. Testar no computador e no telemóvel

É preciso ter o [Node.js 18 ou mais recente](https://nodejs.org).

```bash
npm install
cp .env.example .env        # no Windows: copy .env.example .env
npm run dev
```

Ao arrancar, o `npm run dev` mostra um **QR code no terminal** e guarda-o também em `qr-code.png`.

- **No computador:** abra http://localhost:5173
- **No telemóvel:** leia o QR code com a câmara. O telemóvel tem de estar **na mesma rede Wi-Fi** que o computador.

> O QR code usa o IP do computador na rede (ex.: `http://192.168.1.20:5173`). O endereço `localhost` não serve no telemóvel, porque aí aponta para o próprio telemóvel.

Para gerar só o QR code, ou indicar outro endereço:

```bash
npm run qr
npm run qr -- http://192.168.1.20:5173
```

Se o telemóvel não abrir a página, confirme que a firewall do computador deixa entrar ligações na porta 5173.

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
scripts/qr.js           gera o QR code de teste
server/index.js         API: envia o pedido MB WAY e consulta o estado
src/settings.js         definições da loja
src/pages/Pagamento.jsx ecrã "Pagar a conta"
src/lib/                chamadas à API e validações
src/styles.css
```
