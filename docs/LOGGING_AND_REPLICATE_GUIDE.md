# Guia de Arquitetura de Logs e Lógica do Replicate AI (BarberFlow)

## 1. Visão Geral do Sistema de Logs

O BarberFlow possui um sistema centralizado de logs estruturados em JSON (`src/lib/logger.ts`) com sanitização recursiva de dados sensíveis e métodos de domínio dedicados.

### Principais Recursos
- **Sanitização Automática:** Mascara senhas, hashes, chaves de API (`REPLICATE_API_TOKEN`, `GEMINI_API_KEY`, tokens JWT, etc.).
- **Truncamento de Buffers/Base64:** Evita poluição de terminal e saturação de logs truncando buffers binários e imagens em base64.
- **Correlation ID:** Geração de `requestId` para rastreamento de ponta a ponta.
- **Categorização por Módulo:** Logs tagueados (`REPLICATE_INPAINTING`, `VISAGISM_ENGINE`, `HTTP_API`, `AUTH`, `WHATSAPP_ENGINE`, `EVENT_BUS`).

---

## 2. Ciclo de Vida e Lógica do Replicate (FLUX.1 Fill Dev Inpainting)

O provedor oficial de geração de visual (`ReplicateInpaintingVisagismProvider` em `src/lib/visagism/providers/replicate.ts`) executa o pipeline em 12 etapas estruturadas com telemetria completa via `logger.replicate(...)`:

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Web/WhatsApp)
    participant API as API Generate Preview
    participant Prov as Replicate Provider
    participant FaceAPI as Landmark / Face Detector
    participant Replicate as Replicate Cloud (FLUX.1 Fill)
    participant Gate as Identity & SSIM Gate
    participant Comp as Deterministic Compositor

    Cliente->>API: POST /api/visagismo/session/[token]/generate-preview
    API->>Prov: generatePreview(input)
    Prov->>Prov: logger.replicate('TOKEN_CHECK')
    Prov->>FaceAPI: extractFaceLandmarks()
    Prov->>Prov: logger.replicate('INPUT_VALIDATION')
    Prov->>Prov: generateHairMaskPNG() (logger.replicate('MASK_GENERATION'))
    Prov->>Prov: Compila prompt FLUX (logger.replicate('PROMPT_COMPILATION'))
    Prov->>Replicate: POST /v1/predictions (Prefer: wait)
    Prov->>Prov: logger.replicate('PREDICTION_DISPATCH')
    
    alt HTTP 429 Rate Limit
        Prov->>Prov: Exponential Backoff (logger.replicate('RATE_LIMIT_BACKOFF'))
    else HTTP 404 Model Version Fallback
        Prov->>Replicate: POST /v1/models/black-forest-labs/flux-fill-dev/predictions
        Prov->>Prov: logger.replicate('ENDPOINT_FALLBACK')
    end

    loop Polling (se status != succeeded)
        Prov->>Replicate: GET prediction.urls.get
        Prov->>Prov: logger.replicate('POLLING_STATUS')
    end

    Replicate-->>Prov: Succeeded (output image URL)
    Prov->>Replicate: Download RAW Generated Buffer
    Prov->>Prov: logger.replicate('IMAGE_DOWNLOADED')

    Prov->>Gate: validateIdentityGate(originalBuffer, rawGeneratedBuffer)
    Prov->>Prov: logger.replicate('IDENTITY_GATE_EVALUATED')
    
    alt Identity Gate Rejeitado
        Prov-->>API: null (logger.warn)
    else Identity Gate Aprovado
        Prov->>Comp: compositeInpaintingResult(Smoothstep S-Curve)
        Prov->>Prov: logger.replicate('COMPOSITE_COMPLETED')
        Prov->>Prov: logger.replicate('PREDICTION_SUCCESS')
        Prov-->>API: GeneratePreviewResult
    end
    API-->>Cliente: JSON previewUrl + scores
```

---

## 3. Catálogo de Eventos do Replicate AI

| Etapa (`step`) | Descrição | Metadados Principais |
| :--- | :--- | :--- |
| `TOKEN_CHECK` | Validação de presença do token do Replicate | `tokenFound`, `tokenSource`, `tokenMasked` |
| `INPUT_VALIDATION` | Validação do buffer da foto e resolução | `inputBytes`, `mimeType`, `imageDimensions`, `faceBox`, `confidence` |
| `MASK_GENERATION` | Geração da máscara PNG do cabelo/barba | `maskMode`, `maskBytes`, `maskDurationMs` |
| `PROMPT_COMPILATION` | Refinamento do prompt para FLUX Fill | `rawPrompt`, `compiledPrompt`, `promptHash`, `negativePrompt` |
| `PREDICTION_DISPATCH` | Envio da requisição de inferência ao Replicate | `model`, `modelVersion`, `guidance`, `steps`, `outputFormat`, `outputQuality` |
| `RATE_LIMIT_BACKOFF` | Tentativa de retry com backoff após HTTP 429 | `httpStatus: 429`, `attempt`, `retryDelayMs`, `endpoint` |
| `ENDPOINT_FALLBACK` | Redirecionamento para rota canônica de modelo | `httpStatus: 404`, `fallbackEndpoint`, `model` |
| `POLLING_STATUS` | Acompanhamento do progresso da inferência | `predictionId`, `status`, `attempt`, `pollLatencyMs`, `elapsedMs` |
| `IMAGE_DOWNLOADED` | Download do buffer da imagem RAW gerada | `predictionId`, `outputUrl`, `downloadBytes`, `imgDlLatencyMs` |
| `IDENTITY_GATE_EVALUATED`| Teste de fidelidade biométrica da face gerada | `predictionId`, `passed`, `identityScore`, `boxShiftRatio`, `featureDistance` |
| `COMPOSITE_COMPLETED` | Composição bit-a-bit e cálculo de SSIM | `predictionId`, `outsideDiffRatio`, `faceSSIM`, `compLatencyMs` |
| `PREDICTION_SUCCESS` | Sucesso completo da geração | `predictionId`, `provider`, `model`, `latencyMs`, `identityScore`, `faceSSIM` |
| `PREDICTION_ERROR` | Captura de exceção em qualquer etapa | `error`, `httpStatus`, `latencyMs` |

---

## 4. Exemplos de Uso do Logger

### Emissão Padrão
```typescript
import { logger } from '@/lib/logger';

// Log de informação
logger.info('Processamento concluído com sucesso', {
  module: 'BILLING',
  tenantId: 'tenant_123',
  durationMs: 120,
});

// Log de erro com captura automática de Stack Trace
try {
  // ...
} catch (err) {
  logger.error('Falha ao processar pagamento', err, {
    module: 'FINANCIAL',
    tenantId: 'tenant_123',
  });
}
```

### Emissão Replicate AI
```typescript
logger.replicate('PREDICTION_SUCCESS', {
  predictionId: 'pred_abc123',
  provider: 'REPLICATE_FLUX_FILL',
  model: 'black-forest-labs/flux-fill-dev',
  latencyMs: 1420,
  identityScore: 0.98,
  faceSSIM: 0.99,
  outsideDiffRatio: 0.0,
});
```
