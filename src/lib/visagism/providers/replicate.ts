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
 * Provedor Replicate com Inpainting e Preservação Real de Identidade Facial.
 * 
 * Executa inpainting controlado apenas na máscara, baixa o resultado bruto da IA
 * e realiza a COMPOSIÇÃO DIRETA sobre a foto original:
 * FINAL = ORIGINAL * (1 - MASK) + GERADO * MASK
 */
export class ReplicateInpaintingVisagismProvider implements VisagismImageProvider {
  name = 'REPLICATE_SDXL_INPAINTING';

  // Permite configurar via env o modelo de inpainting (SDXL Inpainting ou FLUX Fill)
  private readonly inpaintModel =
    process.env.VISAGISM_INPAINT_MODEL ||
    process.env.REPLICATE_INPAINT_MODEL ||
    'stability-ai/sdxl-inpainting';

  private readonly modelVersion =
    process.env.REPLICATE_INPAINT_MODEL_VERSION ||
    '95b7223104132402a9ae84cc67741f33b24660d29daea3af70e07a371f119304';

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
        denoisingStrength = 0.65, // Denoise calibrado conservador
      } = input;

      const base64Image = `data:${originalImageMimeType || 'image/jpeg'};base64,${originalImageBuffer.toString('base64')}`;
      const finalMaskBuffer = maskBuffer || generateHairMaskPNG(768, 1024, { mode: maskMode });
      const base64Mask = `data:image/png;base64,${finalMaskBuffer.toString('base64')}`;

      const promptHash = crypto.createHash('md5').update(stylePrompt).digest('hex').slice(0, 8);

      // Log estruturado seguro (sem vazar imagens ou tokens)
      console.log(
        JSON.stringify({
          event: 'visagism_inpaint_request',
          provider: this.name,
          model: this.inpaintModel,
          input_image_bytes: originalImageBuffer.length,
          mask_bytes: finalMaskBuffer.length,
          mask_mode: maskMode,
          denoise: denoisingStrength,
          prompt_hash: promptHash,
        })
      );

      // Prompt limpo e estritamente de edição da região mascarada
      const cleanPrompt = stylePrompt.startsWith('Edit')
        ? stylePrompt
        : `Edit only the masked hair/beard region of the provided photograph. Preserve the original person's face, identity, facial features, skin, eyes, eyebrows, nose and mouth exactly. Apply ${stylePrompt} naturally to the existing person. Do not generate a new person. Do not change facial geometry. Do not change skin tone. Do not change facial expression. Do not change the background. Maintain the original photograph.`;

      // Negative prompt agressivo contra criação de nova pessoa
      const cleanNegativePrompt =
        negativePrompt ||
        'new person, different person, different identity, new face, face replacement, face swap, altered identity, changed facial structure, different eyes, different eyebrows, different nose, different mouth, different lips, different jaw, different skin, different skin tone, beautified face, younger face, older face, different expression, portrait of another person, new human, full body, new background, different clothing, text to image, synthetic portrait, AI generated person, celebrity, model, generic male, generic face, cartoon, 3d render, distorted, blurry, low quality';

      const payloadInput = {
        image: base64Image,
        mask: base64Mask,
        prompt: cleanPrompt,
        negative_prompt: cleanNegativePrompt,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        prompt_strength: denoisingStrength,
      };

      let res: Response | null = null;
      let retries = 0;

      // Retry com backoff exponencial se receber rate limit (HTTP 429)
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

      // Polling caso ultrapasse o timeout da requisição síncrona
      let attempts = 0;
      while (data.status !== 'succeeded' && data.status !== 'failed' && attempts < 25) {
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
          // 1. Baixa a imagem gerada pela IA
          const imgFetch = await fetch(outputUrl);
          if (!imgFetch.ok) {
            console.warn('[VISAGISM_PROVIDER] Falha ao baixar imagem gerada:', imgFetch.status);
            return null;
          }
          const rawGeneratedBuffer = Buffer.from(await imgFetch.arrayBuffer());

          // 2. Executa a COMPOSIÇÃO OBRIGATÓRIA (Original + Região Gerada com Feathering)
          const compResult = await compositeInpaintingResult({
            originalBuffer: originalImageBuffer,
            generatedBuffer: rawGeneratedBuffer,
            maskBuffer: finalMaskBuffer,
            featherSigma: 2.5,
            mode: maskMode,
          });

          console.log(
            JSON.stringify({
              event: 'visagism_inpaint_success',
              provider: this.name,
              generation_id: data.id,
              latency_ms: latencyMs,
              outside_mask_pixel_change: compResult.outsideMaskPixelChangeRatio,
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
