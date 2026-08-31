// BarberFlow - Tipos e Contratos de Visagismo (AI Provider Agnostic)

export type FaceShape = 'Oval' | 'Redondo' | 'Quadrado' | 'Retangular' | 'Triangular' | 'Coracao' | 'Nao sei';

export type VisagismObjective = 'Corte' | 'Barba' | 'Corte + Barba' | 'Cor' | 'Estilo completo' | 'Nao sei';

export type VisagismStyle =
  | 'Classico'
  | 'Moderno'
  | 'Executivo'
  | 'Casual'
  | 'Despojado'
  | 'Degrade'
  | 'Longo'
  | 'Curto'
  | 'Marcante'
  | 'Natural';

export type ChangeLevel = 'Pouco' | 'Medio' | 'Radical';

export type MaintenanceLevel = 'Pouco' | 'Medio' | 'Bastante';

export type HairLengthPreference = 'Sim' | 'Nao' | 'Tanto faz';

export type ColorPreference =
  | 'Natural'
  | 'Castanho'
  | 'Castanho escuro'
  | 'Castanho claro'
  | 'Loiro'
  | 'Platinado'
  | 'Grisalho'
  | 'Colorido';

export interface VisagismProfileInput {
  objective: VisagismObjective;
  style: VisagismStyle;
  changeLevel: ChangeLevel;
  maintenanceLevel: MaintenanceLevel;
  hairLength: HairLengthPreference;
  faceShape: FaceShape;
  colorPreference?: ColorPreference;
}

export interface HaircutItem {
  id: string;
  name: string;
  category: string;
  description: string;
  compatibleFaceShapes: FaceShape[];
  maintenanceLevel: MaintenanceLevel;
  styleCompatibility: VisagismStyle[];
  idealLength: 'Curto' | 'Medio' | 'Longo';
  changeImpact: ChangeLevel;
  suggestedServiceKeywords: string[];
  stylingTips: string;
  referenceImageUrl: string;
}

export interface BeardStyleItem {
  id: string;
  name: string;
  description: string;
  compatibleFaceShapes: FaceShape[];
  maintenanceLevel: MaintenanceLevel;
  idealWithHaircuts: string[];
  stylingTips: string;
}

export interface ColorOptionItem {
  id: string;
  name: string;
  tone: string;
  description: string;
  maintenanceLevel: MaintenanceLevel;
  careTips: string;
}

export interface VisagismRecommendationResult {
  haircutName: string;
  haircutStyle: string;
  beardName?: string;
  hairColor?: string;
  maintenance: string;
  reasoning: string;
  barberTips: string;
  serviceSuggestionName?: string;
  serviceSuggestionId?: string;
  referenceImageUrl?: string;
  score: number;
}

export interface VisagismEvaluationResponse {
  recommendations: VisagismRecommendationResult[];
  explanation: string;
  providerUsed: string;
  isAiGenerated: boolean;
}

/**
 * Interface de Abstração para Provedores de Visagismo (Agnóstico a Provedores)
 */
export interface VisagismAIProvider {
  name: string;
  isGenerative: boolean;
  evaluateProfile(
    profile: VisagismProfileInput,
    tenantServices?: { id: string; name: string; price: number }[]
  ): Promise<VisagismEvaluationResponse>;
  analyzePhoto?(photoBuffer: Buffer, mimeType: string): Promise<{ detectedFaceShape?: FaceShape; notes?: string }>;
}
