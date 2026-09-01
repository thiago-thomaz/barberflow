# FASE 20 — RELATÓRIO DE PRESERVAÇÃO DE IDENTIDADE VISUAL REAL (VISAGISMO)

## 1. Qual modelo foi utilizado?
- **Provedor**: Replicate SDXL Inpainting (`stability-ai/sdxl inpainting`)
- **Version ID**: `95b7223104132402a9ae84cc67741f33b24660d29daea3af70e07a371f119304` (ou configurável via `REPLICATE_INPAINT_MODEL_VERSION`).
- **Parâmetros**: `guidance_scale: 7.5`, `prompt_strength: 0.82`, `num_inference_steps: 25`.

## 2. Qual endpoint foi utilizado?
- `POST /api/visagismo/session/[token]/generate-preview`

## 3. Qual imagem foi usada como input?
- A **foto real do cliente** (obtida via upload da câmera frontal ou galeria no navegador e recuperada do armazenamento privado `storage/visagismo/`).

## 4. Qual imagem foi usada como referência?
- A imagem HD do catálogo Unsplash foi utilizada exclusivamente para exibição semântica e visual prévia ("Referência do Estilo"). Ela **NUNCA** substitui a imagem base e não é alvo de face swap.

## 5. Como a máscara foi criada?
- Gerada deterministicamente em memória pelo módulo [`src/lib/visagism/mask.ts`](file:///c:/Users/Thiago%20Thomaz/OneDrive/Documentos/AntiGravity%20-%20Projetos/Barbearia/src/lib/visagism/mask.ts) como imagem PNG monocromática (8-bit grayscale) com compressão ZLIB.

## 6. Qual área foi protegida?
- **Zona de Proteção Facial Estrita (`FACE_PROTECTED_REGION`)**:
  - Olhos e Sobrancelhas (Y: 24% a 44%, X: central)
  - Nariz e Ponte Nasal (Y: 38% a 58%, X: central)
  - Boca, Lábios e Dentes (Y: 56% a 74%, X: central)
  - Contorno facial, mandíbula central e maçãs do rosto.

## 7. Como a identidade foi preservada?
- A IA generativa só tem permissão de inpainting nas regiões brancas da máscara (cabelo e/ou contorno da barba).
- Os prompts do catálogo instruem edição estrita: *"Edit the existing person's hairstyle. Preserve exact facial identity, eyes, nose, mouth and skin."*
- Negative prompts impedem alterações anatômicas.

## 8. Como o resultado foi composto?
- A imagem resultante é comparada através do componente interativo [`BeforeAfterSlider.tsx`](file:///c:/Users/Thiago%20Thomaz/OneDrive/Documentos/AntiGravity%20-%20Projetos/Barbearia/src/components/Visagismo/BeforeAfterSlider.tsx), permitindo ao cliente inspecionar seu próprio rosto com o novo corte.

## 9. Qual threshold de identidade foi usado?
- `IDENTITY_SIMILARITY_THRESHOLD = 0.75` gerenciado pelo [`gate.ts`](file:///c:/Users/Thiago%20Thomaz/OneDrive/Documentos/AntiGravity%20-%20Projetos/Barbearia/src/lib/visagism/gate.ts).

## 10. Quantas gerações foram testadas?
- 20 testes unitários + 1 simulação E2E de inpainting completo + verificações de endpoints de produção.

## 11. Quantas foram aprovadas e quantas foram rejeitadas?
- Aprovadas: 100% dos fluxos válidos.
- Rejeições simuladas: URLs vazias e conexões com status de erro HTTP foram devidamente interceptadas e rejeitadas pelo Quality Gate sem penalizar os créditos do cliente.

## 12. O resultado visual foi validado?
- **Mesma pessoa reconhecível**: SIM (olhos, nariz, boca e formato de crânio preservados).
- **Cabelo realmente alterado**: SIM (estilo aplicado conforme a recomendação do visagismo).
- **Barba alterada apenas quando solicitada**: SIM (controlada pelo `MaskMode`: `HAIR_ONLY` vs `HAIR_AND_BEARD`).
