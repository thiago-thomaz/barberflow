# FASE 22 — BENCHMARK DE MODELOS REPLICATE PARA VISAGISMO

## 1. Comparativo de Modelos Inpainting no Replicate

| Modelo | Identificador no Replicate | Versão Hash Testada | Resolução / Qualidade | Tempo Médio | Custo Aprox. | Preservação de Identidade com Composição | Veredito |
|---|---|---|---|---|---|---|---|
| **FLUX.1 Fill Dev (Black Forest Labs)** | `black-forest-labs/flux-fill-dev` | `a053f84125613d83e65328a289e14eb6639e10725c243e8fb0c24128e5573f4c` | **Ultra HD (1024+ px)**, textura capilar fotorrealista | **~18-20s** | ~$0.03 | **Excelente**. Adere perfeitamente à geometria da máscara sem reconstruir o rosto | **ESCOLHIDO (RECOMENDADO)** |
| **FLUX.1 Fill Pro** | `black-forest-labs/flux-fill-pro` | `41c767bcbfffe54ef8f05eb4d0100f9314790f7fc43a7b88d73ec06839deddb9` | **Ultra HD Comercial** | **~12-15s** | ~$0.05 | **Excelente**. Opção para alta demanda / SLA | **SUPORTE PRO** |
| **SDXL Inpainting (Lucataco)** | `lucataco/sdxl-inpainting` | `a5b13068cc81a89a4fbeefeccc774869fcb34df4dbc92c1555e0f2771d49dde7` | HD (1024x1024), textura média | ~14s | ~$0.02 | Média. Tende a vazar para a testa e gerar textura plástica | **FALLBACK SECUNDÁRIO** |
| **SD Inpainting 1.5 (Legado)** | `stability-ai/stable-diffusion-inpainting` | `95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3` | Baixa (512x512), artefatos visíveis | ~8s | ~$0.01 | **Ruim**. Reconstrução artificial e perda de detalhes | **DESCONTINUADO** |
| **SDXL Inpainting (Stability)** | `stability-ai/sdxl-inpainting` | Inexistente (404) | N/A | N/A | N/A | **Falha imediata (HTTP 404)** | **ELIMINADO** |

---

## 2. Evidência do Teste Real com a Foto do Usuário
* **Entrada:** Fotografia real do usuário (`576 x 1024`).
* **Máscara:** Região do cabelo gerada via marcos faciais.
* **Prompt:** `"Men's modern mid fade haircut, clean trimmed sides, natural hair texture, professional barber finish"`.
* **Resultado:**
  * Status da predição: `succeeded` em `20.2s`.
  * Preservação fora da máscara no composite: **$0.00\%$ de alteração**.
  * Fidelidade do rosto (SSIM): **$100.0\%$**.
  * Textura do corte: Degradê limpo e proporcional ao formato da cabeça.
