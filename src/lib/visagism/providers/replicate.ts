import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VisagismImageProvider, GeneratePreviewInput, GeneratePreviewResult } from '../types.ts';
import { generateHairMaskPNG } from '../mask.ts';
import { compositeInpaintingResult } from '../composite.ts';
import { extractFaceLandmarks } from '../face-landmarks.ts';
import { validateIdentityGate } from '../identity-gate.ts';
import { logger, maskToken } from '../../logger.ts';

function getReplicateToken(): { token: string; source: string } {
  if (process.env.REPLICATE_API_TOKEN) {
    return { token: process.env.REPLICATE_API_TOKEN, source: 'process.env.REPLICATE_API_TOKEN' };
  }
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
          if (val) return { token: val, source: `file:${p}` };
        }
      }
    }
  } catch (e) {}
  return { token: '', source: 'none' };
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
    const tokenInfo = getReplicateToken();
    const token = tokenInfo.token;

    // 1. Log: Verificação de Token
    logger.replicate('TOKEN_CHECK', {
      tokenFound: !!token,
      tokenSource: tokenInfo.source,
      tokenMasked: maskToken(token),
    });

    if (!token) {
      logger.warn('[VISAGISM_PROVIDER] REPLICATE_API_TOKEN não configurado.', {
        module: 'REPLICATE_INPAINTING',
        action: 'TOKEN_MISSING',
      });
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

      // 2. Extrai landmarks se não foram fornecidos
      const landmarkStart = Date.now();
      const faceLM = landmarks || (await extractFaceLandmarks(originalImageBuffer));
      const landmarkDurationMs = Date.now() - landmarkStart;

      // 3. Log: Validação de Entrada
      logger.replicate('INPUT_VALIDATION', {
        inputBytes: originalImageBuffer.length,
        mimeType: originalImageMimeType || 'image/jpeg',
        imageDimensions: { width: faceLM.imageWidth, height: faceLM.imageHeight },
        faceBox: faceLM.faceBox,
        confidence: faceLM.confidence,
        landmarkDurationMs,
      });

      // 4. Prepara imagem original e máscara anatômica
      const maskStart = Date.now();
      const base64Image = `data:${originalImageMimeType || 'image/jpeg'};base64,${originalImageBuffer.toString('base64')}`;
      const finalMaskBuffer =
        maskBuffer ||
        generateHairMaskPNG(faceLM.imageWidth, faceLM.imageHeight, {
          mode: maskMode,
          landmarks: faceLM,
          geometry,
        });
      const maskDurationMs = Date.now() - maskStart;
      const base64Mask = `data:image/png;base64,${finalMaskBuffer.toString('base64')}`;

      const promptHash = crypto.createHash('md5').update(stylePrompt).digest('hex').slice(0, 8);

      // 5. Log: Geração de Máscara
      logger.replicate('MASK_GENERATION', {
        maskMode,
        maskBytes: finalMaskBuffer.length,
        maskDurationMs,
        customMaskProvided: !!maskBuffer,
      });

      // 6. Prompt estritamente de edição e estilo capilar de alta definição
      let cleanPrompt = stylePrompt;
      if (!cleanPrompt.toLowerCase().startsWith('a portrait photo') && !cleanPrompt.toLowerCase().startsWith('a photorealistic')) {
        const baseDescription = stylePrompt.replace(/^Apply photorealistic men's /i, '').replace(/\.$/, '');
        cleanPrompt = `A photorealistic portrait photograph of this man with ${baseDescription}, crisp clean razor hairline, ultra-detailed human hair strands, authentic barbershop finish, 8k uhd, soft studio lighting`;
      }

      // 7. Log: Compilação do Prompt
      logger.replicate('PROMPT_COMPILATION', {
        rawPrompt: stylePrompt,
        compiledPrompt: cleanPrompt,
        promptHash,
        negativePrompt: negativePrompt || 'none',
      });

      const fluxGuidance = process.env.VISAGISM_FLUX_GUIDANCE
        ? parseFloat(process.env.VISAGISM_FLUX_GUIDANCE)
        : 30.0;

      // 8. Payload específico e calibrado para o FLUX.1 Fill Dev (guidance 30 para forte adesão ao prompt dentro da máscara)
      const payloadInput = {
        image: base64Image,
        mask: base64Mask,
        prompt: cleanPrompt,
        guidance: fluxGuidance,
        num_inference_steps: 30,
        output_format: 'jpg',
        output_quality: 95,
      };

      let res: Response | null = null;
      let retries = 0;
      let targetEndpoint = 'https://api.replicate.com/v1/predictions';

      // 9. Log: Disparo Inicial da Predição
      logger.replicate('PREDICTION_DISPATCH', {
        model: this.inpaintModel,
        modelVersion: this.modelVersion,
        endpoint: targetEndpoint,
        guidance: payloadInput.guidance,
        steps: payloadInput.num_inference_steps,
        outputFormat: payloadInput.output_format,
        outputQuality: payloadInput.output_quality,
        promptHash,
      });

      // Retry com backoff se receber rate limit (HTTP 429)
      while (retries < 4) {
        res = await fetch(targetEndpoint, {
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
          const waitDelayMs = 2000 * retries;
          logger.replicate('RATE_LIMIT_BACKOFF', {
            httpStatus: 429,
            attempt: retries,
            retryDelayMs: waitDelayMs,
            endpoint: targetEndpoint,
          });
          await new Promise((r) => setTimeout(r, waitDelayMs));
          continue;
        }

        // Fallback para endpoint oficial do modelo caso a versão específica retorne 404
        if (res.status === 404) {
          targetEndpoint = `https://api.replicate.com/v1/models/${this.inpaintModel}/predictions`;
          logger.replicate('ENDPOINT_FALLBACK', {
            httpStatus: 404,
            fallbackEndpoint: targetEndpoint,
            model: this.inpaintModel,
          });

          res = await fetch(targetEndpoint, {
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
        logger.replicate('PREDICTION_ERROR', {
          httpStatus: res?.status,
          endpoint: targetEndpoint,
          error: errBody,
        });
        return null;
      }

      let data = await res.json();
      const predictionId = data.id;

      // 10. Polling resiliente caso ultrapasse o timeout inicial
      let attempts = 0;
      while (data.status !== 'succeeded' && data.status !== 'failed' && data.status !== 'canceled' && attempts < 35) {
        if (!data.urls?.get) break;
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;

        const pollStart = Date.now();
        const pollRes = await fetch(data.urls.get, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pollLatencyMs = Date.now() - pollStart;
        data = await pollRes.json();

        logger.replicate('POLLING_STATUS', {
          predictionId,
          status: data.status,
          attempt: attempts,
          pollLatencyMs,
          elapsedMs: Date.now() - startTime,
        });
      }

      const totalApiLatencyMs = Date.now() - startTime;

      if (data.status === 'succeeded' && data.output) {
        const outputUrl = typeof data.output === 'string' ? data.output : data.output[0] || null;
        if (outputUrl) {
          // 11. Baixa a imagem gerada (RAW)
          const imgDlStart = Date.now();
          const imgFetch = await fetch(outputUrl);
          if (!imgFetch.ok) {
            logger.replicate('PREDICTION_ERROR', {
              predictionId,
              step: 'IMAGE_DOWNLOAD',
              httpStatus: imgFetch.status,
              outputUrl,
            });
            return null;
          }
          const rawGeneratedBuffer = Buffer.from(await imgFetch.arrayBuffer());
          const imgDlLatencyMs = Date.now() - imgDlStart;

          logger.replicate('IMAGE_DOWNLOADED', {
            predictionId,
            outputUrl,
            downloadBytes: rawGeneratedBuffer.length,
            imgDlLatencyMs,
          });

          // 12. Executa o IDENTITY GATE no buffer RAW ANTES de compor
          const gateStart = Date.now();
          const identityCheck = await validateIdentityGate({
            originalBuffer: originalImageBuffer,
            generatedRawBuffer: rawGeneratedBuffer,
            maskBuffer: finalMaskBuffer,
          });
          const gateLatencyMs = Date.now() - gateStart;

          logger.replicate('IDENTITY_GATE_EVALUATED', {
            predictionId,
            passed: identityCheck.passed,
            identityScore: identityCheck.identityScore,
            boxShiftRatio: identityCheck.boxShiftRatio,
            featureDistance: identityCheck.featureDistance,
            reason: identityCheck.reason,
            gateLatencyMs,
          });

          if (!identityCheck.passed) {
            logger.warn(`[REPLICATE_AI] Identity Gate rejeitou imagem RAW gerada: ${identityCheck.reason}`, {
              module: 'REPLICATE_INPAINTING',
              action: 'IDENTITY_GATE_REJECTED',
              metadata: {
                predictionId,
                identityScore: identityCheck.identityScore,
                boxShiftRatio: identityCheck.boxShiftRatio,
                featureDistance: identityCheck.featureDistance,
                reason: identityCheck.reason,
              },
            });
            return null;
          }

          // 13. Executa a COMPOSIÇÃO DETERMINÍSTICA BIT A BIT com Smoothstep S-Curve
          const compStart = Date.now();
          const compResult = await compositeInpaintingResult({
            originalBuffer: originalImageBuffer,
            generatedBuffer: rawGeneratedBuffer,
            maskBuffer: finalMaskBuffer,
            faceBox: faceLM.faceBox,
            featherSigma: 1.2,
            mode: maskMode,
          });
          const compLatencyMs = Date.now() - compStart;
          const totalLatencyMs = Date.now() - startTime;

          logger.replicate('COMPOSITE_COMPLETED', {
            predictionId,
            outsideDiffRatio: compResult.outsideMaskPixelChangeRatio,
            faceSSIM: compResult.faceSSIM,
            compLatencyMs,
            totalLatencyMs,
          });

          logger.replicate('PREDICTION_SUCCESS', {
            predictionId,
            provider: this.name,
            model: this.inpaintModel,
            latencyMs: totalLatencyMs,
            identityScore: identityCheck.identityScore,
            faceSSIM: compResult.faceSSIM,
            outsideDiffRatio: compResult.outsideMaskPixelChangeRatio,
            outputUrl,
          });

          return {
            imageUrl: outputUrl,
            provider: this.name,
            generationId: data.id,
            maskMode,
            latencyMs: totalLatencyMs,
            rawGeneratedBuffer,
            finalCompositeBuffer: compResult.compositeBuffer,
            outsideMaskPixelChangeRatio: compResult.outsideMaskPixelChangeRatio,
            faceSSIM: compResult.faceSSIM,
            identityScore: identityCheck.identityScore,
          };
        }
      }

      if (data.status === 'failed' || data.status === 'canceled') {
        logger.replicate(data.status === 'failed' ? 'PREDICTION_FAILED' : 'PREDICTION_CANCELED', {
          predictionId,
          status: data.status,
          error: data.error,
          latencyMs: totalApiLatencyMs,
        });
      } else {
        logger.warn(`[REPLICATE_AI] Predição finalizou em estado inesperado: ${data.status}`, {
          module: 'REPLICATE_INPAINTING',
          action: 'UNEXPECTED_STATUS',
          metadata: { predictionId, status: data.status, error: data.error },
        });
      }

      return null;
    } catch (err: any) {
      const errorLatencyMs = Date.now() - startTime;
      logger.replicate('PREDICTION_ERROR', {
        error: {
          name: err?.name || 'Error',
          message: err?.message || String(err),
          stack: err?.stack,
        },
        latencyMs: errorLatencyMs,
      });
      return null;
    }
  }
}

export const replicateImageProvider = new ReplicateInpaintingVisagismProvider();
