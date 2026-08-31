import type {
  VisagismAIProvider,
  VisagismProfileInput,
  VisagismEvaluationResponse,
  VisagismRecommendationResult,
  HaircutItem,
  BeardStyleItem,
} from '../types.ts';
import { HAIRCUTS_CATALOG, BEARD_STYLES_CATALOG, COLOR_OPTIONS_CATALOG } from '../catalog.ts';

export class DeterministicVisagismProvider implements VisagismAIProvider {
  name = 'DETERMINISTIC_RULES_ENGINE';
  isGenerative = false;

  async evaluateProfile(
    profile: VisagismProfileInput,
    tenantServices?: { id: string; name: string; price: number }[]
  ): Promise<VisagismEvaluationResponse> {
    const {
      objective,
      style,
      changeLevel,
      maintenanceLevel,
      hairLength,
      faceShape,
      colorPreference,
    } = profile;

    // 1. Score each haircut in catalog
    const scoredHaircuts: { haircut: HaircutItem; score: number; reasoning: string[] }[] = [];

    for (const cut of HAIRCUTS_CATALOG) {
      let score = 50; // Base score
      const reasoning: string[] = [];

      // 1.1 Face shape match (up to +25 pts)
      if (faceShape === 'Nao sei') {
        score += 15;
        reasoning.push('Corte com proporção equilibrada e visualmente versátil.');
      } else if (cut.compatibleFaceShapes.includes(faceShape)) {
        score += 25;
        reasoning.push(`Harmoniza perfeitamente com o formato de rosto ${faceShape}.`);
      } else {
        score -= 15;
      }

      // 1.2 Style match (up to +20 pts)
      if (cut.styleCompatibility.includes(style)) {
        score += 20;
        reasoning.push(`Alinhado ao seu estilo preferido (${style}).`);
      } else if (style === 'Natural' || style === 'Casual') {
        score += 10;
      }

      // 1.3 Maintenance level match (up to +15 pts)
      if (cut.maintenanceLevel === maintenanceLevel) {
        score += 15;
        reasoning.push(`Tempo de dedicação ideal para sua rotina (${maintenanceLevel.toLowerCase()} manutenção).`);
      } else if (
        (maintenanceLevel === 'Pouco' && cut.maintenanceLevel === 'Medio') ||
        (maintenanceLevel === 'Bastante' && cut.maintenanceLevel === 'Medio')
      ) {
        score += 8;
      } else if (maintenanceLevel === 'Pouco' && cut.maintenanceLevel === 'Bastante') {
        score -= 15;
      }

      // 1.4 Hair length preference match (up to +15 pts)
      if (hairLength === 'Sim' && (cut.idealLength === 'Medio' || cut.idealLength === 'Longo')) {
        score += 15;
        reasoning.push('Preserva o comprimento atual dos seus fios.');
      } else if (hairLength === 'Nao' && cut.idealLength === 'Curto') {
        score += 15;
        reasoning.push('Proporciona leveza e visual renovado com fios mais curtos.');
      } else if (hairLength === 'Tanto faz') {
        score += 10;
      }

      // 1.5 Change impact match (up to +15 pts)
      if (cut.changeImpact === changeLevel) {
        score += 15;
      } else if (changeLevel === 'Radical' && cut.changeImpact === 'Medio') {
        score += 8;
      }

      // Objective booster
      if (objective === 'Corte' || objective === 'Corte + Barba' || objective === 'Estilo completo') {
        score += 5;
      }

      // Ensure clamped score between 55 and 98
      const finalScore = Math.min(98, Math.max(55, Math.round(score)));

      scoredHaircuts.push({
        haircut: cut,
        score: finalScore,
        reasoning,
      });
    }

    // Sort descending by score
    scoredHaircuts.sort((a, b) => b.score - a.score);

    // Pick top 3 unique haircuts
    const top3Haircuts = scoredHaircuts.slice(0, 3);

    // 2. Resolve matching Beard Style
    const recommendations: VisagismRecommendationResult[] = top3Haircuts.map((item, index) => {
      const cut = item.haircut;

      // Find compatible beard style
      let chosenBeard: BeardStyleItem | null = null;

      if (objective === 'Corte') {
        chosenBeard = BEARD_STYLES_CATALOG.find((b) => b.id === 'barba-por-fazer') || null;
      } else {
        const matchingBeards = BEARD_STYLES_CATALOG.filter(
          (b) =>
            b.compatibleFaceShapes.includes(faceShape === 'Nao sei' ? 'Oval' : faceShape) &&
            b.idealWithHaircuts.includes(cut.id)
        );

        if (matchingBeards.length > 0) {
          chosenBeard = matchingBeards[index % matchingBeards.length];
        } else {
          chosenBeard =
            BEARD_STYLES_CATALOG.find((b) => b.compatibleFaceShapes.includes(faceShape === 'Nao sei' ? 'Oval' : faceShape)) ||
            BEARD_STYLES_CATALOG[0];
        }
      }

      // Resolve Color suggestion
      let chosenColor = 'Tom Natural';
      if (colorPreference && colorPreference !== 'Natural') {
        const foundColor = COLOR_OPTIONS_CATALOG.find((c) =>
          c.name.toLowerCase().includes(colorPreference.toLowerCase())
        );
        chosenColor = foundColor ? foundColor.name : colorPreference;
      }

      // Match with real tenant services
      let suggestedServiceName = 'Corte Masculino';
      let suggestedServiceId: string | undefined = undefined;

      if (tenantServices && tenantServices.length > 0) {
        // Look for combo if objective is Corte + Barba
        if (objective === 'Corte + Barba' || objective === 'Estilo completo') {
          const combo = tenantServices.find((s) =>
            s.name.toLowerCase().includes('combo') ||
            (s.name.toLowerCase().includes('corte') && s.name.toLowerCase().includes('barba'))
          );
          if (combo) {
            suggestedServiceName = combo.name;
            suggestedServiceId = combo.id;
          }
        }

        if (!suggestedServiceId) {
          // Find matching keyword in service names
          for (const kw of cut.suggestedServiceKeywords) {
            const match = tenantServices.find((s) => s.name.toLowerCase().includes(kw.toLowerCase()));
            if (match) {
              suggestedServiceName = match.name;
              suggestedServiceId = match.id;
              break;
            }
          }
        }

        // Fallback to first active service
        if (!suggestedServiceId && tenantServices[0]) {
          suggestedServiceName = tenantServices[0].name;
          suggestedServiceId = tenantServices[0].id;
        }
      }

      const reasoningText = item.reasoning.join(' ') || 'Combinação clássica que valoriza suas características faciais.';

      return {
        haircutName: cut.name,
        haircutStyle: cut.category,
        beardName: chosenBeard ? chosenBeard.name : undefined,
        hairColor: chosenColor,
        maintenance: `${cut.maintenanceLevel} manutenção`,
        reasoning: reasoningText,
        barberTips: cut.stylingTips,
        serviceSuggestionName: suggestedServiceName,
        serviceSuggestionId: suggestedServiceId,
        referenceImageUrl: cut.referenceImageUrl,
        score: item.score,
      };
    });

    return {
      recommendations,
      explanation:
        'Recomendações elaboradas pelo Consultor de Visagismo BarberFlow com base em geometria facial, estilo de vida e nível de manutenção.',
      providerUsed: this.name,
      isAiGenerated: this.isGenerative,
    };
  }
}
