import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VisagismImageProvider, GeneratePreviewInput, GeneratePreviewResult } from '../types.ts';
import { generateHairMaskPNG } from '../mask.ts';

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
 * Provedor Replicate com Inpainting e Preservação de Identidade Facial.
 * Utiliza a foto real do cliente como imagem base e aplica máscara capilar com proteção facial.
 */
export class ReplicateInpaintingVisagismProvider implements VisagismImageProvider {
  name = 'REPLICATE_SDXL_INPAINTING';

  // SD Inpainting Official Version Hash
  private readonly modelVersion =
    process.env.REPLICATE_INPAINT_MODEL_VERSION ||
    '95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3';

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
      } = input;

      const base64Image = `data:${originalImageMimeType || 'image/jpeg'};base64,${originalImageBuffer.toString('base64')}`;

      // Se a máscara não foi fornecida, gera máscara com modo especificado
      const finalMaskBuffer = maskBuffer || generateHairMaskPNG(768, 1024, { mode: maskMode });
      const base64Mask = `data:image/png;base64,${finalMaskBuffer.toString('base64')}`;

      const promptHash = crypto.createHash('md5').update(stylePrompt).digest('hex').slice(0, 8);

      // Log técnico seguro
      console.log(
        JSON.stringify({
          event: 'visagism_inpaint_request',
          provider: this.name,
          input_image_present: !!originalImageBuffer,
          input_image_bytes: originalImageBuffer.length,
          mask_present: !!finalMaskBuffer,
          mask_bytes: finalMaskBuffer.length,
          mask_mode: maskMode,
          prompt_hash: promptHash,
        })
      );

      let res: Response | null = null;
      let retries = 0;

      const payloadInput = {
        image: base64Image,
        mask: base64Mask,
        prompt: stylePrompt,
        negative_prompt:
          negativePrompt ||
          'different person, new face, altered eyes, altered nose, altered mouth, changed facial structure, cartoon, 3d render, blurry, low quality',
        num_inference_steps: 25,
        guidance_scale: 7.5,
        prompt_strength: 0.82,
      };

      // Retry com backoff exponencial se houver 429
      while (retries < 4) {
        res = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'wait',
          },
          body: JSON.stringify({
            version: this.modelVersion,
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

      // Polling caso ultrapasse o timeout de espera síncrona
      let attempts = 0;
      while (data.status !== 'succeeded' && data.status !== 'failed' && attempts < 20) {
        if (!data.urls?.get) break;
        await new Promise((r) => setTimeout(r, 2000));
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
          console.log(
            JSON.stringify({
              event: 'visagism_inpaint_success',
              provider: this.name,
              generation_id: data.id,
              latency_ms: latencyMs,
              status: data.status,
            })
          );

          return {
            imageUrl: outputUrl,
            provider: this.name,
            generationId: data.id,
            maskMode,
            latencyMs,
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

// Singleton export para reutilização
export const replicateImageProvider = new ReplicateInpaintingVisagismProvider();

/**
 * Função de conveniência compatível com rotas legadas
 */
export async function generateClientVisualPreview(params: {
  clientPhotoBuffer: Buffer;
  clientPhotoMimeType: string;
  stylePrompt?: string;
  negativePrompt?: string;
  maskBuffer?: Buffer;
  maskMode?: any;
}): Promise<string | null> {
  const result = await replicateImageProvider.generatePreview({
    originalImageBuffer: params.clientPhotoBuffer,
    originalImageMimeType: params.clientPhotoMimeType,
    maskBuffer: params.maskBuffer,
    maskMode: params.maskMode || 'HAIR_ONLY',
    stylePrompt:
      params.stylePrompt ||
      "Edit existing person's hairstyle. Apply a modern clean men's haircut. Preserve exact facial identity and features. Photorealistic.",
    negativePrompt: params.negativePrompt,
  });

  return result ? result.imageUrl : null;
}
