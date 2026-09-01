# ⚙️ BARBERFLOW — FASE 18: MANUAL DE OPERAÇÕES E RUNBOOK
## Visagismo no WhatsApp & Geração Facial

---

## 1. Variáveis de Ambiente e Configurações

| Variável | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(Configurado)* | Chave da Google AI API para visão computacional (`gemini-3.6-flash`). |
| `REPLICATE_API_TOKEN` | *(Configurado)* | Token da Replicate API para inpainting facial (`lucataco/faceswap`). |
| `VISAGISM_MAX_GENERATIONS_PER_SESSION` | `3` | Número máximo de gerações faciais por sessão. |
| `VISAGISM_IMAGE_RETENTION_HOURS` | `24` | Tempo de retenção de fotos em disco antes da expiração. |
| `VISAGISM_WHATSAPP_ENABLED` | `true` | Feature flag para exibir/ocultar a opção 6 no menu do WhatsApp. |

---

## 2. Procedimento de Rollback de Emergência
Se por qualquer motivo houver necessidade de desativar o fluxo de Visagismo no WhatsApp sem afetar agendamentos, caixa ou lembretes:
1. Definir `VISAGISM_WHATSAPP_ENABLED=false` nas variáveis de ambiente OU reiniciar o container.
2. A opção 6 é automaticamente removida do menu e o WhatsApp volta a operar exclusivamente com as opções 1 a 5.
3. Não há impacto em bancos de dados, agendamentos já criados ou clientes cadastrados.

---

## 3. Tratamento de Erros e Contingências
- **Falha no Provedor Gemini (Timeout / Cota)**: A engine utiliza fallback determinístico com análise morfológica e permite que o cliente selecione o formato do rosto manualmente na interface web.
- **Falha no Provedor Replicate (Timeout / 429)**: O sistema possui 4 tentativas com backoff exponencial; caso a geração falhe, a interface exibe as referências em alta definição e o motivo da recomendação, mantendo a experiência estética ativa.
- **Falha no WhatsApp / WAHA**: Não bloqueia a navegação nem a experiência do cliente pela web (`https://barber.projetosunion.cloud/visagismo`).
