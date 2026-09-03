import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VisagismImageProvider, GeneratePreviewInput, GeneratePreviewResult } from '../types.ts';
import { generateHairMaskPNG } from '../mask.ts';
import { compositeInpaintingResult } from '../composite.ts';

function getReplicateToken(): string {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  try {
    const envPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
      '/app/.env',
      '/data/coolify/applications/7ho00pvb569n5m3jgee0fnsi/.env',
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        const match = content.match(/^REPLICATE_API_TOKEN=(.+)$/m);
        if (match) {
          let val = match[1].trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val) return val;
        }
      }
    }
  } catch (e) {}
  return '';
}

/**
 * Tabela de versões verificadas e oficiais de modelos no Replicate
 */
const KNOWN_MODEL_VERSIONS: Record<string, string> = {
  'black-forest-labs/flux-fill-dev': 'a053f84125613d83e65328a289e14eb6639e10725c243e8fb0c24128e5573f4c',
  'black-forest-labs/flux-fill-pro': '41c767bcbfffe54ef8f05eb4d0100f9314790f7fc43a7b88d73ec06839deddb9',
  'lucataco/sdxl-inpainting': 'a5b13068cc81a89a4fbeefeccc774869fcb34df4dbc92c1555e0f2771d49dde7',
  'stability-ai/stable-diffusion-inpainting': '95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
};

/**
 * Provedor Replicate com FLUX.1 Fill e Preservação Real de Identidade Facial (Fase 22).
 */
export class ReplicateInpaintingVisagismProvider implements VisagismImageProvider {
  name = 'REPLICATE_SDXL_INPAINTING';

  // Modelo padrão: FLUX.1 Fill Dev (Black Forest Labs)
  private readonly inpaintModel =
    process.env.VISAGISM_INPAINT_MODEL ||
    process.env.REPLICATE_INPAINT_MODEL ||
    'black-forest-labs/flux-fill-dev';

  private getModelVersion(): string {
    if (process.env.REPLICATE_INPAINT_MODEL_VERSION) {
      return process.env.REPLICATE_INPAINT_MODEL_VERSION;
    }
    return KNOWN_MODEL_VERSIONS[this.inpaintModel] || KNOWN_MODEL_VERSIONS['black-forest-labs/flux-fill-dev'];
  }

  async generatePreview(input: GeneratePreviewInput): Promise<GeneratePreviewResult | null> {
    const startTime = Date.now();
    const token = getReplicateToken();
    if (!token) {
      console.warn('[VISAGISM_PROVIDER] REPLICATE_API_TOKEN não configurado.');
      return null;
    }

    try {
      const {
        originalImageBuffer,
        originalImageMimeType,
        maskBuffer,
        maskMode = 'HAIR_ONLY',
        stylePrompt,
        negativePrompt,
        denoisingStrength = 0.50,
      } = input;

      const base64Image = `data:${originalImageMimeType || 'image/jpeg'};base64,${originalImageBuffer.toString('base64')}`;
      const finalMaskBuffer = maskBuffer || generateHairMaskPNG(768, 1024, { mode: maskMode });
      const base64Mask = `data:image/png;base64,${finalMaskBuffer.toString('base64')}`;

      const promptHash = crypto.createHash('md5').update(stylePrompt).digest('hex').slice(0, 8);
      const version = this.getModelVersion();

      console.log(
        JSON.stringify({
          event: 'visagism_inpaint_request',
          provider: this.name,
          model: this.inpaintModel,
          version: version.slice(0, 10) + '...',
          input_image_bytes: originalImageBuffer.length,
          mask_bytes: finalMaskBuffer.length,
          mask_mode: maskMode,
          denoise: denoisingStrength,
          prompt_hash: promptHash,
        })
      );

      // Prompt calibrado especificamente para inpainting de alta fidelidade
      const cleanPrompt = stylePrompt.startsWith('Men') || stylePrompt.startsWith('Edit')
        ? stylePrompt
        : `Men's ${stylePrompt}, natural realistic hair texture, professional clean barber cut, preserve existing face and identity`;

      // Monta payload adaptado ao modelo selecionado
      let payloadInput: Record<string, any> = {};

      if (this.inpaintModel.includes('flux-fill')) {
        // FLUX.1 Fill Dev / Pro Schema
        payloadInput = {
          image: base64Image,
          mask: base64Mask,
          prompt: cleanPrompt,
          guidance: 30.0,
          num_inference_steps: 25,
          output_format: 'jpg',
          output_quality: 92,
        };
      } else if (this.inpaintModel.includes('sdxl')) {
        // SDXL Inpainting Schema
        payloadInput = {
          image: base64Image,
          mask: base64Mask,
          prompt: cleanPrompt,
          negative_prompt: negativePrompt || 'new person, different face, distorted, blurry, deformed',
          guidance_scale: 7.5,
          steps: 25,
          strength: denoisingStrength,
        };
      } else {
        // Fallback genérico
        payloadInput = {
          image: base64Image,
          mask: base64Mask,
          prompt: cleanPrompt,
          guidance_scale: 7.5,
          num_inference_steps: 25,
        };
      }

      let res: Response | null = null;
      let retries = 0;

      while (retries < 4) {
        res = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'wait',
          },
          body: JSON.stringify({
            version,
            input: payloadInput,
          }),
        });

        if (res.status === 429) {
          retries++;
          await new Promise((r) => setTimeout(r, 2000 * retries));
          continue;
        }
        break;
      }

      if (!res || !res.ok) {
        const errBody = res ? await res.text() : 'No response';
        console.warn('[VISAGISM_PROVIDER] Replicate HTTP Error status:', res?.status, errBody);
        return null;
      }

      let data = await res.json();

      // Polling resiliente caso o timeout de requisição síncrona expire
      let attempts = 0;
      while (data.status !== 'succeeded' && data.status !== 'failed' && attempts < 35) {
        if (!data.urls?.get) break;
        await new Promise((r) => setTimeout(r, 2500));
        const pollRes = await fetch(data.urls.get, {
          headers: { Authorization: `Bearer ${token}` },
        });
        data = await pollRes.json();
        attempts++;
      }

      const latencyMs = Date.now() - startTime;

      if (data.status === 'succeeded' && data.output) {
        const outputUrl = typeof data.output === 'string' ? data.output : data.output[0] || null;
        if (outputUrl) {
          // 1. Baixa a imagem gerada (RAW do inpainting)
          const imgFetch = await fetch(outputUrl);
          if (!imgFetch.ok) {
            console.warn('[VISAGISM_PROVIDER] Falha ao baixar imagem gerada:', imgFetch.status);
            return null;
          }
          const rawGeneratedBuffer = Buffer.from(await imgFetch.arrayBuffer());

          // 2. Executa a COMPOSIÇÃO BIT A BIT DETERMINÍSTICA
          const compResult = await compositeInpaintingResult({
            originalBuffer: originalImageBuffer,
            generatedBuffer: rawGeneratedBuffer,
            maskBuffer: finalMaskBuffer,
            featherSigma: 2.0,
            mode: maskMode,
          });

          console.log(
            JSON.stringify({
              event: 'visagism_inpaint_success',
              provider: this.name,
              model: this.inpaintModel,
              generation_id: data.id,
              latency_ms: latencyMs,
              outside_diff: compResult.outsideMaskPixelChangeRatio,
              face_ssim: compResult.faceSSIM,
            })
          );

          return {
            imageUrl: outputUrl,
            provider: this.name,
            generationId: data.id,
            maskMode,
            latencyMs,
            rawGeneratedBuffer,
            finalCompositeBuffer: compResult.compositeBuffer,
            outsideMaskPixelChangeRatio: compResult.outsideMaskPixelChangeRatio,
            faceSSIM: compResult.faceSSIM,
          };
        }
      }

      console.warn('[VISAGISM_PROVIDER] Predição não sucedeu:', data.status, data.error);
      return null;
    } catch (err) {
      console.error('[VISAGISM_PROVIDER] Erro durante inpainting:', err);
      return null;
    }
  }
}

export const replicateImageProvider = new ReplicateInpaintingVisagismProvider();
