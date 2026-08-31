import type { VisagismAIProvider } from './types.ts';
import { GoogleGeminiVisagismProvider } from './providers/gemini.ts';
import { DeterministicVisagismProvider } from './providers/deterministic.ts';

let currentProvider: VisagismAIProvider = new GoogleGeminiVisagismProvider();

/**
 * Retorna o provedor de Visagismo ativo no sistema.
 * Prioriza o Google Gemini Vision quando a chave estiver disponível,
 * mantendo o DeterministicVisagismProvider como fallback de alta resiliência.
 */
export function getVisagismProvider(): VisagismAIProvider {
  return currentProvider;
}

/**
 * Permite plugar ou alternar provedores de IA em tempo de execução
 */
export function setVisagismProvider(provider: VisagismAIProvider): void {
  currentProvider = provider;
}
