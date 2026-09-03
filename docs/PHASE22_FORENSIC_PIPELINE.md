# FASE 22 — RELATÓRIO FORENSE COMPLETO DO PIPELINE DE VISAGISMO

## 1. Mapeamento Ponta a Ponta do Fluxo Anterior

```
[ CLIENTE ] (Upload da Selfie via Câmera/Galeria)
    │
    ▼ (1. Frontend: compressAndNormalizeImage via Canvas HTML5)
[ POST /api/visagismo/session/[token]/photo ]
    │
    ▼ (2. Gravação do Arquivo)
[ Storage Privado ] (/app/storage/visagismo/visagism_{sessionId}_{hash}.jpg)
    │
    ▼ (3. Gemini Vision)
[ Análise de Formato Facial ] (Oval, Quadrado, Redondo, etc.)
    │
    ▼ (4. Questionário & Recomendações)
[ POST /api/visagismo/session/[token]/evaluate ]
    │  Retorna 3 cortes do catálogo HAIRCUTS_CATALOG
    │  Cada recomendação embute: referenceImageUrl (Foto do modelo Unsplash)
    │
    ▼ (5. Disparo da Simulação)
[ POST /api/visagismo/session/[token]/generate-preview ]
    │
    ├── Recupera foto original do storage
    ├── Pre-flight Quality Check
    ├── Detecção Facial YCbCr (heurística proporcional estática)
    ├── Geração da Máscara (generateMaskByMode)
    │
    ▼ (6. Chamada Replicate)
[ ReplicateInpaintingVisagismProvider ]
    │  ❌ MODELO CONFIGURADO: stability-ai/sdxl-inpainting (404 no Replicate)
    │  ❌ HASH HARDCODED: 95b7223104132402a9ae84cc67741f33b24660d29daea3af70e07a371f119304 (404 no Replicate)
    │  ❌ FALHA SILENCIOSA: Retornou null em 1.3s
    │
    ▼ (7. Retorno ao Frontend)
[ API Response: { success: false, previewUrl: null } ]
    │
    ▼ (8. Comportamento Visual no Frontend)
[ Step 6 da Página ]
    Como aiPreviewImg permaneceu nulo, a UI exibiu o card lateral:
    "Referência do Estilo — Inspiração HD" com a FOTO DO MODELO DO UNSPLASH!
    O usuário visualizou um modelo completamente diferente ao lado da sua foto!
```

---

## 2. Respostas Forenses aos 31 Pontos de Auditoria

1. **Onde a foto original entra?**
   No input de arquivo do Step 2 de `src/app/visagismo/session/[token]/page.tsx` (`capture="user"` ou galeria).
2. **Onde ela é armazenada?**
   No diretório do servidor `/app/storage/visagismo/visagism_{sessionId}_{hash}.jpg`.
3. **Qual arquivo/imagem é enviado ao provedor?**
   A foto original em base64 (`data:image/jpeg;base64,...`).
4. **Qual imagem é enviada para máscara?**
   Um buffer PNG gerado pelo backend (`generateMaskByMode`).
5. **Qual imagem é enviada para referência?**
   Nenhuma imagem de referência é enviada ao inpainting; porém, a URL de referência do catálogo ficava salva nos metadados.
6. **Qual imagem é usada como target?**
   Em versões legadas (Fase 19/20), modelos como `faceswap` usavam a foto de catálogo como target_image. Na Fase 21, nenhuma target foi enviada, mas o modelo falhou e a UI exibiu o modelo do catálogo.
7. **Qual imagem é usada como base?**
   A foto do cliente.
8. **Qual modelo Replicate é realmente chamado?**
   Tentava-se chamar o hash `95b7223104132402a9ae84cc67741f33b24660d29daea3af70e07a371f119304`. A API da Replicate retornou HTTP 404 (versão inexistente).
9. **Qual payload exato é enviado?**
   `{ version, input: { image, mask, prompt, negative_prompt, num_inference_steps, guidance_scale, prompt_strength } }`.
10. **Qual imagem retorna?**
    Em produção recente: NENHUMA (`null`), devido ao erro 404 da versão.
11. **Onde ocorre composição?**
    Em `src/lib/visagism/composite.ts` via `sharp`.
12. **Onde ocorre resize?**
    No canvas do cliente (max 1024x1024) e no `sharp` durante a composição.
13. **Onde ocorre crop?**
    No recorte para cálculo de SSIM (`calculateProtectedFaceSSIM`).
14. **Onde ocorre conversão de formato?**
    No cliente (Blob para JPEG) e no servidor (PNG para máscara, JPEG para composite).
15. **Onde ocorre recompressão?**
    No salvamento final via `sharp.jpeg({ quality: 95 })`.
16. **Qual imagem é efetivamente retornada ao frontend?**
    Na tentativa recente: nenhuma (`previewUrl: null`). Quando gerada: `/api/visagismo/session/[token]/preview/preview_*.jpg`.
17. **Qual URL o frontend efetivamente exibe?**
    Quando `aiPreviewImg` está ausente, o frontend exibe `current.referenceImageUrl` (foto Unsplash de outro homem!).
18. **Se existe algum fallback que substitui a imagem?**
    Sim! Na UI, a ausência de simulação exibe o card de inspiração de modelo ao lado da foto do usuário.
19. **Se existe cache?**
    No estado React local (`aiPreviews[selectedRecIndex]`).
20. **Se existe CDN?**
    As fotos de referência vêm da CDN do Unsplash (`images.unsplash.com`).
21. **Se existe algum processamento client-side?**
    Sim, `compressAndNormalizeImage` via Canvas 2D.
22. **Se existe alguma transformação adicional?**
    Feathering gaussiano na máscara (sigma 2.0 a 2.5).
23. **Se existe algum uso de target_image?**
    Não na versão da Fase 21, mas resquícios de chave no payload do frontend existiam.
24. **Se existe algum uso de imagem de catálogo durante a geração?**
    Não no backend, mas sim no frontend como imagem comparativa.
25. **Se existe algum face swap escondido?**
    Não no código atual.
26. **Se existe algum modelo alternativo sendo chamado?**
    Não.
27. **Se existe fallback silencioso para outro modelo?**
    Não.
28. **Se existe geração text-to-image?**
    Não.
29. **Se existe image-to-image?**
    Não, apenas inpainting.
30. **Se existe inpainting?**
    Sim, inpainting por máscara.
31. **Se a máscara realmente corresponde à foto do usuário?**
    A máscara anterior usava heurística por aglomerado de cor de pele YCbCr, gerando caixas imprecisas e cobrindo partes da testa sem landmarks anatômicos reais.

---

## 3. Diagnóstico Definitivo da Perda de Identidade

1. **Apresentação de Modelo de Catálogo ao Cliente:** Quando a IA falha (como ocorreu devido ao hash 404), a interface mostrava a foto do catálogo do Unsplash com o novo corte. O cliente olhava a foto do modelo e assumia que o sistema havia "trocado seu rosto por outra pessoa".
2. **Inpainting sem Landmarks Reais:** O cálculo de pele YCbCr estimava a linha dos olhos em `y + height * 0.38` e a testa em `0.12`. Em formatos de rosto compridos ou fotos tiradas de baixo para cima, o topo da testa era invadido pela máscara, gerando pele nova sintética.
3. **Ausência de Validação de Embedding Facial (ArcFace/ResNet):** O gate anterior só verificava a similaridade estrutural após a composição. Não havia um teste biométrico comparando se o embedding da face da imagem gerada correspondia à face original do cliente.
