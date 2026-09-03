// BarberFlow - Tipos e Contratos de Visagismo (AI Provider Agnostic & Inpainting Ready)

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

export type MaskRegionType = 'hair' | 'hair_beard' | 'beard';
export type MaskMode = 'HAIR_ONLY' | 'BEARD_ONLY' | 'HAIR_AND_BEARD';

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
  stylePrompt?: string;
  negativePrompt?: string;
  maskType?: MaskRegionType;
}

export interface BeardStyleItem {
  id: string;
  name: string;
  description: string;
  compatibleFaceShapes: FaceShape[];
  maintenanceLevel: MaintenanceLevel;
  idealWithHaircuts: string[];
  stylingTips: string;
  stylePrompt?: string;
  negativePrompt?: string;
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
 * Interface de Abstração para Provedores de Avaliação de Perfil (Gemini/Deterministic)
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

/**
 * Interface de Abstração para Geração de Imagem com Preservação de Identidade (Inpainting)
 */
export interface GeneratePreviewInput {
  originalImageBuffer: Buffer;
  originalImageMimeType: string;
  maskBuffer?: Buffer;
  maskMode?: MaskMode;
  stylePrompt: string;
  negativePrompt?: string;
  identityStrength?: number;
  denoisingStrength?: number;
}

export interface GeneratePreviewResult {
  imageUrl: string;
  provider: string;
  generationId?: string;
  maskMode?: MaskMode;
  latencyMs?: number;
  rawGeneratedBuffer?: Buffer;
  finalCompositeBuffer?: Buffer;
  outsideMaskPixelChangeRatio?: number;
  faceSSIM?: number;
}

export interface VisagismImageProvider {
  name: string;
  generatePreview(input: GeneratePreviewInput): Promise<GeneratePreviewResult | null>;
}

export interface IdentityGateResult {
  passed: boolean;
  score?: number;
  reason?: string;
  error?: string;
}
