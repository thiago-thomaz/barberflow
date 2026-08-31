# BarberFlow — Operação, Métricas e Funil de Visagismo

## 1. Eventos e Métricas Coletadas

O sistema registra métricas de forma anônima e isolada por barbearia (`VisagismMetric`):

| Evento | Descrição |
|---|---|
| `visagism_started` | Usuário gerou um link de sessão pelo WhatsApp ou web |
| `photo_uploaded` | Usuário enviou selfie com sucesso e deu consentimento |
| `recommendation_generated` | Questionário respondido e 3 recomendações geradas |
| `style_saved` | Usuário salvou o visual ou compartilhou nativamente |
| `whatsapp_shared` | Usuário clicou para enviar a escolha ao barbeiro via WhatsApp |
| `appointment_clicked` | Usuário clicou para agendar o serviço correspondente |

---

## 2. Limpeza de Arquivos Temporários
Recomenda-se configurar uma rotina cron para expurgo de fotos com mais de 24 horas:
```bash
# Limpeza física de arquivos expirados
node -e 'const { prisma } = require("./src/lib/prisma"); ...'
```
