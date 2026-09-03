import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VisagismImageProvider, GeneratePreviewInput, GeneratePreviewResult } from '../types.ts';
import { generateHairMaskPNG } from '../mask.ts';
import { compositeInpaintingResult } from '../composite.ts';
import { extractFaceLandmarks } from '../face-landmarks.ts';
import { validateIdentityGate } from '../identity-gate.ts';

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
 * Provedor Replicate com Inpainting SOTA (FLUX.1 Fill Dev / Pro) e Preservação de Identidade 100%.
 * 
 * 1. Envia a foto original e a máscara anatômica ao FLUX.1 Fill
 * 2. Valida a identidade no buffer RAW gerado com o Identity Gate
 * 3. Realiza a COMPOSIÇÃO DETERMINÍSTICA sobre a foto original:
 *    FINAL = ORIGINAL * (1 - MASK) + GERADO * MASK
 */
export class ReplicateInpaintingVisagismProvider implements VisagismImageProvider {
  name = 'REPLICATE_FLUX_FILL';

  // Modelo oficial SOTA de Inpainting do Replicate
  private readonly inpaintModel =
    process.env.VISAGISM_INPAINT_MODEL ||
    process.env.REPLICATE_INPAINT_MODEL ||
    'black-forest-labs/flux-fill-dev';

  // Hash oficial verificado do FLUX.1 Fill Dev
  private readonly modelVersion =
    process.env.REPLICATE_INPAINT_MODEL_VERSION ||
    'a053f84125613d83e65328a289e14eb6639e10725c243e8fb0c24128e5573f4c';

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
        geometry,
        landmarks,
      } = input;

      // 1. Extrai landmarks se não foram fornecidos
      const faceLM = landmarks || (await extractFaceLandmarks(originalImageBuffer));

      // 2. Prepara imagem original e máscara anatômica
      const base64Image = `data:${originalImageMimeType || 'image/jpeg'};base64,${originalImageBuffer.toString('base64')}`;
      const finalMaskBuffer =
        maskBuffer ||
        generateHairMaskPNG(faceLM.imageWidth, faceLM.imageHeight, {
          mode: maskMode,
          landmarks: faceLM,
          geometry,
        });
      const base64Mask = `data:image/png;base64,${finalMaskBuffer.toString('base64')}`;

      const promptHash = crypto.createHash('md5').update(stylePrompt).digest('hex').slice(0, 8);

      console.log(
        JSON.stringify({
          event: 'visagism_flux_request_started',
          provider: this.name,
          model: this.inpaintModel,
          input_bytes: originalImageBuffer.length,
          mask_bytes: finalMaskBuffer.length,
          mask_mode: maskMode,
          prompt_hash: promptHash,
        })
      );

      // 3. Prompt estritamente de edição e estilo capilar de alta definição
      let cleanPrompt = stylePrompt;
      if (
        !cleanPrompt.toLowerCase().includes('fade') &&
        !cleanPrompt.toLowerCase().includes('cut') &&
        !cleanPrompt.toLowerCase().includes('beard') &&
        !cleanPrompt.toLowerCase().includes('hair') &&
        !cleanPrompt.toLowerCase().includes('apply')
      ) {
        cleanPrompt = `Apply photorealistic men's ${stylePrompt} haircut, sharp fade gradient on temples, crisp natural hairline, highly detailed hair strands, barbershop styling, natural hair sheen, 8k resolution, cinematic studio lighting`;
      }

      // 4. Payload específico e calibrado para o FLUX.1 Fill Dev
      const payloadInput = {
        image: base64Image,
        mask: base64Mask,
        prompt: cleanPrompt,
        guidance: 28.0,
        num_inference_steps: 28,
        output_format: 'jpg',
        output_quality: 95,
      };

      let res: Response | null = null;
      let retries = 0;

      // Retry com backoff se receber rate limit (HTTP 429)
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

        // Fallback para endpoint oficial do modelo caso a versão específica retorne 404
        if (res.status === 404) {
          res = await fetch(`https://api.replicate.com/v1/models/${this.inpaintModel}/predictions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Prefer: 'wait',
            },
            body: JSON.stringify({
              input: payloadInput,
            }),
          });
        }
        break;
      }

      if (!res || !res.ok) {
        const errBody = res ? await res.text() : 'No response';
        console.warn('[VISAGISM_PROVIDER] Replicate HTTP Error status:', res?.status, errBody);
        return null;
      }

      let data = await res.json();

      // Polling resiliente caso ultrapasse o timeout inicial
      let attempts = 0;
      while (data.status !== 'succeeded' && data.status !== 'failed' && data.status !== 'canceled' && attempts < 35) {
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
          // 5. Baixa a imagem gerada (RAW)
          const imgFetch = await fetch(outputUrl);
          if (!imgFetch.ok) {
            console.warn('[VISAGISM_PROVIDER] Falha ao baixar imagem gerada:', imgFetch.status);
            return null;
          }
          const rawGeneratedBuffer = Buffer.from(await imgFetch.arrayBuffer());

          // 6. Executa o IDENTITY GATE no buffer RAW ANTES de compor
          const identityCheck = await validateIdentityGate({
            originalBuffer: originalImageBuffer,
            generatedRawBuffer: rawGeneratedBuffer,
            maskBuffer: finalMaskBuffer,
          });

          if (!identityCheck.passed) {
            console.warn(
              JSON.stringify({
                event: 'visagism_identity_gate_rejected',
                reason: identityCheck.reason,
                identity_score: identityCheck.identityScore,
                box_shift: identityCheck.boxShiftRatio,
                feature_dist: identityCheck.featureDistance,
              })
            );
            return null;
          }

          // 7. Executa a COMPOSIÇÃO DETERMINÍSTICA BIT A BIT com Smoothstep S-Curve
          const compResult = await compositeInpaintingResult({
            originalBuffer: originalImageBuffer,
            generatedBuffer: rawGeneratedBuffer,
            maskBuffer: finalMaskBuffer,
            faceBox: faceLM.faceBox,
            featherSigma: 3.5,
            mode: maskMode,
          });

          console.log(
            JSON.stringify({
              event: 'visagism_flux_success',
              provider: this.name,
              generation_id: data.id,
              latency_ms: latencyMs,
              identity_score: identityCheck.identityScore,
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
            identityScore: identityCheck.identityScore,
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
