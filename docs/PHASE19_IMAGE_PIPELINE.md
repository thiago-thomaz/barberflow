# FASE 19 — PIPELINE DE IMAGEM & INPAINTING

## 1. VisagismImageProvider Interface
A arquitetura foi desacoplada de provedores específicos através da interface:

```typescript
export interface GeneratePreviewInput {
  originalImageBuffer: Buffer;
  originalImageMimeType: string;
  maskBuffer?: Buffer;
  stylePrompt: string;
  negativePrompt?: string;
  identityStrength?: number;
  denoisingStrength?: number;
}

export interface VisagismImageProvider {
  name: string;
  generatePreview(input: GeneratePreviewInput): Promise<GeneratePreviewResult | null>;
}
```

## 2. Modelos Homologados
1. **SDXL Inpainting (`stability-ai/sdxl` inpainting)**:
   - Utilizado por padrão no Replicate.
   - Parâmetros:
     - `image`: Foto original em base64
     - `mask`: Máscara capilar gerada em tempo de execução
     - `prompt`: Prompt específico de corte de cabelo
     - `negative_prompt`: Negative prompt de proteção facial
     - `num_inference_steps`: 25
     - `guidance_scale`: 7.5
     - `prompt_strength`: 0.82
2. **FLUX Fill (`black-forest-labs/flux-fill-dev`)**:
   - Suportado como provedor intercambiável via configuração de ambiente.

## 3. Geração de Máscara (`src/lib/visagism/mask.ts`)
- Gera uma imagem PNG monocromática em memória (8-bit grayscale) com compressão ZLIB sem dependências de C++ nativo.
- Branco (255): Região do corte/cabelo/barba a ser repintada.
- Preto (0): Região anatômica dos olhos, nariz, boca e contorno facial protegida.
