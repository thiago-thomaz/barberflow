import type { VisagismAIProvider } from './types.ts';
import { DeterministicVisagismProvider } from './providers/deterministic.ts';

let currentProvider: VisagismAIProvider = new DeterministicVisagismProvider();

/**
 * Retorna o provedor de Visagismo ativo no sistema.
 * Por padrão, utiliza o DeterministicVisagismProvider (100% gratuito e local).
 */
export function getVisagismProvider(): VisagismAIProvider {
  return currentProvider;
}

/**
 * Permite plugar futuros provedores de IA Generativa ou Visão Computacional
 * sem alterar o resto da aplicação.
 */
export function setVisagismProvider(provider: VisagismAIProvider): void {
  currentProvider = provider;
}
