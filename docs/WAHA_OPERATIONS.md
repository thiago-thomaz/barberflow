# BarberFlow — WAHA Operações, Pareamento e Recuperação

## 📱 1. Pareamento do WhatsApp via QR Code

1. Acesse o painel BarberFlow: **https://barber.projetosunion.cloud/automacoes**
2. Na aba **WhatsApp Engine & Lembretes**, clique em **Iniciar Sessão WAHA**.
3. Aponte a câmera do WhatsApp no celular (Menu ➔ Aparelhos Conectados ➔ Conectar um aparelho).
4. O status mudará imediatamente para **WORKING** (Verde / Conectado).

---

## 🔄 2. Reconexão e Manutenção

- Se o celular for desconectado: O status no BarberFlow mudará para `SCAN_QR_CODE`. Basta clicar em "Gerar Novo QR Code".
- **Reinicialização da VPS / Container:** Graças ao volume persistente `/app/.sessions`, a sessão é restaurada automaticamente sem necessidade de novo escaneamento.

---

## 🧪 3. Teste de Envio Rápido

Para validar a entrega de mensagens:
```bash
curl -X POST https://evo.projetosunion.cloud/api/sendText \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: bf_waha_sec_9e06180371424a1b80c355fb5dc21182" \
  -d '{
    "session": "default",
    "chatId": "5514998016163@c.us",
    "text": "✅ Teste do WhatsApp BarberFlow realizado com sucesso!"
  }'
```
