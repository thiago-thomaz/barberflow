# Guia de Operações & Observabilidade — BarberFlow

Este documento orienta o time de operações sobre monitoramento, métricas de observabilidade, alertas e troubleshooting em produção.

---

## 1. Métricas Principais de Operação

| Indicador | Threshold Saudável | Alerta Crítico | Ação |
|---|---|---|---|
| **Healthcheck (`/api/health`)** | HTTP 200 (< 50ms) | HTTP 503 / Timeout | Reiniciar serviço / Verificar banco |
| **Uso de Memória** | < 70% | > 85% | Escalar réplicas / Investigar memory leak |
| **Erros 5xx na API** | < 0.1% | > 1.0% | Inspecionar logs estruturados via `requestId` |
| **Webhook Delivery Latency** | < 800ms | > 5000ms | Verificar conectividade com nó n8n |

---

## 2. Rastreamento por Correlation / Request ID

Todas as requisições recebem ou geram um `requestId` único no formato `req_xxxxxxxxxxxxxxxx`.

Ao investigar um erro reportado por um usuário ou logado no sistema:
```bash
# Filtrar logs pelo Request ID específico
docker logs barberflow_app | grep "req_a1b2c3d4e5f6"
```

---

## 3. Rotinas de Manutenção Periódica

1. **Expiração Automática de Trials**:
   O serviço `getTenantSubscription` atualiza automaticamente para `EXPIRED` assinaturas cujo período de teste tenha finalizado.
2. **Expiração de Tokens de Recuperação**:
   Tokens de redefinição de senha expiram após 1 hora da emissão.
3. **Limpeza de Logs de Auditoria Antigos**:
   Logs com mais de 365 dias podem ser arquivados em bucket frio.
