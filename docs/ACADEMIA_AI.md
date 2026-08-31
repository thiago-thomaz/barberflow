# Estratégia e Motor de Inteligência Artificial — Consultor BarberFlow

## 1. Princípio Fundamental
O Consultor BarberFlow foi projetado com **Zero Custo de API** e **100% de Confiabilidade Operacional**. Ele não depende de serviços externos pagos (como OpenAI ou Anthropic) para fornecer diagnósticos estratégicos e planos de ação precisos para barbearias.

---

## 2. Arquitetura em 4 Camadas

```
[ Camada 1: Motor Determinístico por Regras & NLP de Intenções ]
                         ↓
[ Camada 2: Leitura Autorizada de Métricas Agregadas do Tenant ]
                         ↓
[ Camada 3: Base Especializada de Conhecimento & Disclaimers Legais ]
                         ↓
[ Camada 4: Opcional Ollama Local / Fallback Silencioso ]
```

### Camada 1 — Motor Determinístico
- Detecção inteligente de intenções por palavras-chave e tópicos de negócio (horários vazios, precificação, comissões, clientes inativos, marketing local, MEI).
- Geração instantânea (0 a 10ms) de pareceres consistentes e livres de alucinações.

### Camada 2 — Integração de Métricas do Próprio Tenant
- Acesso estrito em modo **SOMENTE LEITURA** a agregações de faturamento, ticket médio, clientes inativos e ocupação.
- Proibição absoluta de execução de SQL livre ou comandos de escrita.

### Camada 3 — Formato Estruturado em 5 Blocos
Toda orientação retornada pela IA segue obrigatoriamente a estrutura:
1. **Problema Identificado**
2. **Diagnóstico & Análise Técnica**
3. **Recomendação Estratégica**
4. **Plano de Ação em 3 Passos (Passo 1, Passo 2, Passo 3)**
5. **Métrica de Acompanhamento**
+ **Disclaimer Legal/Tributário** quando o tema envolve MEI, impostos ou contratos.

### Camada 4 — Fallback Local
- Se existir uma instância Ollama configurada via `OLLAMA_URL`, o sistema tenta consultar o modelo com timeout de 3.5s.
- Em caso de falha ou ausência do serviço local, o fallback para a Camada 1 ocorre de maneira silenciosa, sem mensagens de erro para o usuário.
