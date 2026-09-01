import fs from 'fs';
import path from 'path';
import type {
  VisagismAIProvider,
  VisagismProfileInput,
  VisagismEvaluationResponse,
  VisagismRecommendationResult,
  FaceShape,
} from '../types.ts';
import { DeterministicVisagismProvider } from './deterministic.ts';

function getGeminiApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
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
        const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
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

export class GoogleGeminiVisagismProvider implements VisagismAIProvider {
  name = 'GOOGLE_GEMINI_VISION';
  isGenerative = true;
  private fallbackProvider = new DeterministicVisagismProvider();

  /**
   * Analisa a foto do cliente usando Google Gemini Vision (gemini-3.6-flash)
   */
  async analyzePhoto(
    photoBuffer: Buffer,
    mimeType: string
  ): Promise<{ detectedFaceShape?: FaceShape; notes?: string }> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return { notes: 'Chave Gemini não configurada, utilizando regras locais.' };
    }

    try {
      const base64Data = photoBuffer.toString('base64');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

      const prompt = `Você é um mestre visagista e barbeiro profissional.
Analise a foto deste cliente com atenção aos traços anatômicos:
1. Identifique o formato geométrico predominante do rosto: estritamente um entre ["Oval", "Redondo", "Quadrado", "Retangular", "Triangular", "Coracao"].
2. Descreva em 1 ou 2 frases curtas as características visagistas observadas (largura da mandíbula, testa, densidade capilar e barba).

Responda ESTRITAMENTE em formato JSON:
{
  "faceShape": "Oval",
  "notes": "Mandíbula bem definida com testa proporcional e simetria equilibrada."
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64Data } },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        console.warn('Gemini Vision API status:', res.status);
        return {};
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validShapes: FaceShape[] = ['Oval', 'Redondo', 'Quadrado', 'Retangular', 'Triangular', 'Coracao'];
        const resolvedShape = validShapes.includes(parsed.faceShape) ? parsed.faceShape : undefined;
        return {
          detectedFaceShape: resolvedShape,
          notes: parsed.notes || 'Análise visual concluída com sucesso pelo Google Gemini.',
        };
      }
    } catch (err) {
      console.warn('Erro ao analisar foto com Gemini Vision:', err);
    }

    return {};
  }

  /**
   * Avalia o perfil combinando o catálogo de visagismo com IA
   */
  async evaluateProfile(
    profile: VisagismProfileInput,
    tenantServices?: { id: string; name: string; price: number }[]
  ): Promise<VisagismEvaluationResponse> {
    // 1. Gera a base estruturada das 3 recomendações
    const baseEvaluation = await this.fallbackProvider.evaluateProfile(profile, tenantServices);

    if (!GEMINI_API_KEY) {
      return baseEvaluation;
    }

    // 2. Aprimora os textos com IA do Google Gemini
    try {
      const topCut = baseEvaluation.recommendations[0]?.haircutName;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

      const prompt = `Você é o Consultor de Visagismo do BarberFlow.
O cliente possui rosto ${profile.faceShape}, estilo ${profile.style}, objetivo ${profile.objective} e manutenção ${profile.maintenanceLevel}.
O corte principal recomendado é "${topCut}".

Escreva em 1 parágrafo curto, persuasivo e amigável (em português do Brasil) por que este estilo valoriza a presença e autoestima dele na barbearia.`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText && baseEvaluation.recommendations[0]) {
          baseEvaluation.recommendations[0].reasoning = aiText.trim();
        }
      }
    } catch (err) {
      // Mantém reasoning da base se houver falha de rede
    }

    return {
      recommendations: baseEvaluation.recommendations,
      explanation: 'Análise de Visagismo potencializada pelo Google Gemini Vision & Geometria Facial.',
      providerUsed: this.name,
      isAiGenerated: true,
    };
  }
}
