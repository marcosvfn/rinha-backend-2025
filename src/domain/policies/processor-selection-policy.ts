import { ProcessorConfig } from '../entities/payment';
import { ProcessorHealthStatus } from '../entities/payment';

export interface ProcessorSelectionContext {
  defaultProcessor: ProcessorConfig;
  fallbackProcessor: ProcessorConfig;
  defaultHealth?: ProcessorHealthStatus;
  fallbackHealth?: ProcessorHealthStatus;
}

export class ProcessorSelectionPolicy {
  /**
   * Regra de negócio pura: Selecionar o melhor processador baseado na saúde
   * - Sempre preferir Default se estiver saudável (menor taxa)
   * - Usar Fallback apenas quando Default estiver falhando
   */
  static selectProcessor(context: ProcessorSelectionContext): ProcessorConfig {
    const { defaultProcessor, fallbackProcessor, defaultHealth } = context;

    // Se não temos informação de saúde, usar default (otimista)
    if (!defaultHealth) {
      return defaultProcessor;
    }

    // Se default está saudável, usar default
    if (!defaultHealth.failing) {
      return defaultProcessor;
    }

    // Default está falhando, usar fallback
    return fallbackProcessor;
  }

  /**
   * Regra de negócio: Determinar se devemos confiar no cache de saúde
   */
  static shouldTrustCachedHealth(lastChecked: Date, maxAgeMs: number = 30000): boolean {
    const now = new Date();
    const ageMs = now.getTime() - lastChecked.getTime();
    return ageMs <= maxAgeMs;
  }

  /**
   * Regra de negócio: Calcular prioridade dos processadores
   */
  static getProcessorPriority(processor: ProcessorConfig): number {
    // Default tem prioridade maior (taxa menor)
    return processor.name === 'default' ? 1 : 2;
  }
}