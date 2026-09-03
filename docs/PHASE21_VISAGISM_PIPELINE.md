# FASE 21 — ARQUITETURA DO PIPELINE DE VISAGISMO

## 1. Diagrama de Fluxo Ponta a Ponta

```
[ Usuário ]
    │
    ▼ (Upload de Foto no Navegador)
[ Pre-flight Quality Check ] (Resolução >= 250px, Proporção, Rosto detectável)
    │
    ▼ (Detecção Anatômica em Node.js com Sharp)
[ Face Geometry & Landmarks ] (Caixa facial, Linha dos Olhos, Nariz, Boca, Linha Capilar)
    │
    ▼ (Geração Dinâmica de Máscara Grayscale 8-bit)
[ Mask Engine ] ──────────────► FACE_PROTECTED_MASK (0)
    │                           HAIR_EDIT_MASK (255)
    │                           BEARD_EDIT_MASK (255 se aplicável)
    ▼                           FEATHERING GRADIENT (5 a 12px)
[ Inpainting Replicate ] (SDXL Inpainting / FLUX.1 Fill, Denoise 0.65)
    │
    ▼ (Download do Buffer Bruto da IA)
[ Compositing Engine (Sharp) ]
    │   FINAL = ORIGINAL * (1 - MASK) + GERADO * MASK
    │
    ▼ (Auditoria Automatizada)
[ Tri-Gate de Validação ]
    ├── Pixel Gate: diff fora da máscara < 1% (Real: 0.00%)
    ├── Face SSIM Gate: fidelidade do rosto > 95% (Real: 100.0%)
    └── Quality & Sanity Check
    │
    ├─────────► [ REJEITADO ] ──► Mensagem Amigável (Não debita simulação)
    ▼
[ APROVADO ]
    │
    ▼
[ Armazenamento Privado ] (/storage/visagismo/previews/preview_*.jpg)
    │
    ▼
[ Frontend BeforeAfterSlider ] (Foto Original vs. Foto Composta)
```

## 2. Especificação Técnica dos Módulos

### `src/lib/visagism/face-detector.ts`
* Analisa a foto em espaço de cor YCbCr e localiza o aglomerado de pele da face.
* Identifica dinamicamente a caixa envolvente (`faceBox: { x, y, width, height }`), eliminando qualquer dependência de percentuais fixos do canvas.
* Rejeita fotos borradas, muito distantes ou sem rosto antes de gastar recursos de GPU.

### `src/lib/visagism/mask.ts`
* Cria um buffer PNG monocromático (8-bit grayscale) com compressão ZLIB nativa.
* Delimita a `FACE_PROTECTED_REGION` ancorada nos marcos dinâmicos da `FaceGeometry`.
* Isola os modos:
  * `HAIR_ONLY`: Edição restrita ao topo do crânio e têmporas.
  * `BEARD_ONLY`: Edição restrita ao maxilar e queixo inferior.
  * `HAIR_AND_BEARD`: Ambas as regiões ativadas.

### `src/lib/visagism/composite.ts`
* Decodifica `originalBuffer` e `generatedBuffer` em memória através de `sharp`.
* Aplica suavização gaussiana de 2 a 3 pixels na máscara para garantir transição imperceptível na linha do cabelo.
* Percorre os pixels e garante que onde a máscara é 0, o pixel final é idêntico ao original.
* Calcula `outsideMaskPixelChangeRatio` e `calculateProtectedFaceSSIM`.

### `src/lib/visagism/gate.ts`
* Valida a integridade antes da entrega ao usuário.
* Rejeita qualquer anomalia sem comprometer o fluxo de agendamento.
