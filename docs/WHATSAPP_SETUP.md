# BarberFlow — Guia de Configuração WhatsApp (WAHA & n8n)

## 1. Variáveis de Ambiente Necessárias
No arquivo `.env` da aplicação ou nas variáveis do Coolify:

```env
# Provedor padrão: WAHA ou MOCK (ou META para Cloud API)
WHATSAPP_PROVIDER=WAHA

# URL da instância WAHA HTTP API (ex: serviço interno Docker ou URL externa)
WAHA_URL=http://waha:3000
WAHA_API_KEY=sua_chave_secreta_waha
WAHA_SESSION=default

# Webhook Secret para autenticação de entrada
WHATSAPP_VERIFY_TOKEN=barberflow_webhook_verify_secret
WEBHOOK_SECRET=barberflow_webhook_verify_secret

# URL base da aplicação para links de calendário e cancelamento
NEXT_PUBLIC_APP_URL=https://barber.projetosunion.cloud
```

---

## 2. Configuração do Webhook no WAHA
Configure o endpoint de webhook no WAHA apontando para o BarberFlow:

- **Target URL**: `https://barber.projetosunion.cloud/api/webhooks/whatsapp`
- **Events**: `message`, `message.any`
- **Method**: `POST`
- **Payload Format**: JSON

---

## 3. Configuração do Fluxo no n8n (Opcional para Orquestração Avançada)
Caso utilize o n8n como gateway de automação intermediário:
1. **Webhook Node**: Recebe mensagem do WAHA via POST.
2. **HTTP Request Node**: Encaminha para o BarberFlow:
   - **URL**: `https://barber.projetosunion.cloud/api/webhooks/whatsapp`
   - **Method**: `POST`
   - **Body Parameters**:
     ```json
     {
       "from": "={{ $json.body.from }}",
       "text": "={{ $json.body.body }}",
       "receiverPhone": "={{ $json.body.to }}",
       "messageId": "={{ $json.body.id }}"
     }
     ```
3. **Response Handling**: O retorno do BarberFlow já contém `{ reply: "texto formatado" }`.
4. **WAHA Send Node**: Dispara a resposta para o WhatsApp do cliente.

---

## 4. Teste em Modo Sandbox / Local
Para desenvolvimento local e testes automatizados, o BarberFlow ativa automaticamente o `MockWhatsAppProvider` caso `WAHA_URL` não esteja definido, permitindo testar toda a lógica conversacional e agendamentos sem custo e sem necessidade de conexão ativa.
