# FASE 19 — OPERAÇÕES, OBSERVABILIDADE & LIMITES

## 1. Variáveis de Ambiente
| Variável | Padrão | Descrição |
|---|---|---|
| `VISAGISM_V2_ENABLED` | `true` | Habilita a nova arquitetura de inpainting e fluxo web. |
| `REPLICATE_API_TOKEN` | *(Configurado)* | Token de acesso para APIs de Inpainting Replicate. |
| `GEMINI_API_KEY` | *(Configurado)* | Chave de IA para análise de formato de rosto. |
| `VISAGISM_MAX_GENERATIONS_PER_SESSION` | `3` | Limite de simulações com IA por sessão de cliente. |

## 2. Métricas de Observabilidade
Eventos gravados na tabela `VisagismMetric`:
- `visagism_session_started`: Criação de link/sessão
- `photo_uploaded`: Envio de selfie pelo cliente
- `analysis_completed`: Análise geométrica facial
- `generation_started`: Início de inpainting
- `preview_generated`: Conclusão com sucesso de simulação
- `generation_failed`: Falha na geração
- `appointment_clicked`: Clique para agendar o corte escolhido
- `whatsapp_shared`: Compartilhamento de escolha via WhatsApp
