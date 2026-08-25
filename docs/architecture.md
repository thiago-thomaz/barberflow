# Arquitetura do Sistema — BarberFlow

O **BarberFlow** é uma plataforma SaaS multitenant moderna, leve e de alta performance desenvolvida para barbearias, com foco em agenda, gestão de clientes, controle de retenção/recorrência e automação com n8n.

---

## 1. Visão Geral da Arquitetura

```
+-----------------------------------------------------------------------+
|                              CLIENTES                                 |
|   +--------------------------+        +---------------------------+   |
|   |  Painel Administrativo   |        | Página Pública Agendamento|   |
|   |  Next.js 14 App Router   |        |      (/b/[slug])          |   |
|   +------------+-------------+        +-------------+-------------+   |
+----------------|------------------------------------|-----------------+
                 |                                    |
                 v                                    v
+-----------------------------------------------------------------------+
|                           CAMADA DE API / SERVER                      |
|   +---------------------------------------------------------------+   |
|   |  - Autenticação & Sessão JWT (HMAC-SHA256)                    |   |
|   |  - Middleware de Isolamento Multitenant (barbershopId)        |   |
|   |  - Motor Anti-Conflito com Lock Serializável                  |   |
|   |  - Motor de Recorrência & "Dinheiro na Mesa"                  |   |
|   |  - Event Bus & HMAC Webhook Dispatcher                        |   |
|   +-------------------------------+-------------------------------+   |
+-----------------------------------|-----------------------------------+
                                    |
                 +------------------+------------------+
                 |                                     |
                 v                                     v
+----------------------------------+ +----------------------------------+
|          BANCO DE DADOS          | |        AUTOMAÇÕES EXTERNAS       |
|    Prisma ORM (PostgreSQL/SQLite)| |      Instâncias n8n / Webhooks   |
|   - Isolamento lógico por tenant | |   - Assinatura HMAC-SHA256       |
|   - Snapshot histórico de preços | |   - WhatsApp API / Evolution API |
+----------------------------------+ +----------------------------------+
```

---

## 2. Princípios de Design & Decisões Técnicas

1. **Simplicidade Radical no Ponto de Contato**: O cliente final da barbearia consegue agendar em menos de 45 segundos, sem necessidade de cadastrar senha ou criar conta prévia.
2. **Isolamento Multitenant Estrito**: Toda tabela de dados operacionais referencia obrigatoriamente `barbershopId`. Qualquer consulta ou mutação valida a sessão do usuário logado contra o tenant alvo.
3. **Consistência em Agendamentos (Zero Overbooking)**: O backend valida sobreposição de intervalos no formato `novo_inicio < existente_fim AND novo_fim > existente_inicio` com nível de isolamento serializável.
4. **Imutabilidade Histórica**: Ao criar um agendamento, os dados de preço e nome do serviço são gravados em snapshots (`servicePriceSnapshot`, `serviceNameSnapshot`), garantindo que relatórios financeiros passados nunca sejam alterados quando o barbeiro reajustar seus preços.
5. **Automação Desacoplada via n8n**: O sistema emite eventos tipados em tempo real com assinaturas criptográficas, permitindo que qualquer fluxo de WhatsApp, SMS ou pós-venda seja alterado no n8n sem modificar o código do SaaS.
