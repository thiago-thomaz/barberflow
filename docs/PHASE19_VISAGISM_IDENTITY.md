# FASE 19 — PRESERVAÇÃO DEFINITIVA DE IDENTIDADE NO VISAGISMO

## 1. Contexto e Diagnóstico
Anteriormente, o módulo de Visagismo gerava simulações utilizando um modelo de **Face Swap** (`lucataco/faceswap`). Esse pipeline utilizava a foto de um modelo do catálogo (Unsplash) como imagem base (`target_image`) e recortava o rosto do cliente (`swap_image`), resultando na criação de uma pessoa completamente diferente com tom de pele, crânio, pescoço, orelhas e iluminação do modelo de catálogo.

## 2. Nova Arquitetura de Preservação de Identidade
Na nova arquitetura, o pipeline é baseado em **Inpainting Direto sobre a Foto Real do Cliente**:

```
                  FOTO ORIGINAL DO CLIENTE (Base)
                                +
               MÁSCARA DA REGIÃO EDITÁVEL (Cabelo/Barba)
                                +
                   PROMPT ESPECÍFICO DO ESTILO
                                +
              NEGATIVE PROMPT DE PROTEÇÃO FACIAL
                                ↓
                 PIPELINE DE INPAINTING (SDXL)
                                ↓
             FOTO DO MESMO CLIENTE COM NOVO CORTE
```

## 3. Regiões Protegidas vs Regiões Editáveis
- **Regiões 100% Protegidas (Mask Value = 0 / Black)**:
  - Olhos e Sobrancelhas
  - Nariz
  - Boca e Dentes
  - Pele Facial e Bochechas
  - Formato e Estrutura Óssea da Face
  - Orelhas e Fundo
- **Regiões Editáveis (Mask Value = 255 / White)**:
  - Cabelo e Topo do Crânio
  - Linha da Testa e Têmporas (Hairline)
  - Barba / Bigode (apenas quando solicitado)

## 4. Prompts Estruturados no Catálogo
Cada um dos 18 cortes do catálogo agora possui prompts de inpainting dedicados:
- **Exemplo (Mid Fade)**:
  - `stylePrompt`: *"Edit the existing person's hairstyle. Apply a stylish men's mid fade haircut with clean gradient transition on the sides and styled top. Preserve exact facial identity, eyes, nose, mouth and skin. Photorealistic, crisp natural hairline."*
  - `negativePrompt`: *"different person, new face, altered eyes, altered nose, altered mouth, changed facial structure, changed skin tone, face replacement, deformed face, unrealistic facial features, cartoon, illustration, 3d render, blurry, distorted, low quality, deformed ears"*
