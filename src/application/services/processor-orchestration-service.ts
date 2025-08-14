import { ProcessorConfig } from "@/domain/entities/payment";
import { ProcessorType } from "@/domain/value-objects/processor-type";
import { HealthRepository } from "@/domain/repositories/health-repository";
import { PaymentProcessorService } from "@/domain/services/payment-processor-service";
import { ProcessorSelectionPolicy } from "@/domain/policies/processor-selection-policy";
import { LoggerService } from "@/shared/logging";

export class ProcessorOrchestrationService {
  private logger: LoggerService;

  constructor(
    private healthRepository: HealthRepository,
    private paymentProcessorService: PaymentProcessorService,
    private processorConfigs: Map<string, ProcessorConfig>
  ) {
    this.logger = new LoggerService("processor-orchestration-service");
  }

  async selectBestProcessor(): Promise<ProcessorConfig> {
    const defaultProcessor = this.processorConfigs.get("default")!;
    const fallbackProcessor = this.processorConfigs.get("fallback")!;

    // 1. Verificar se podemos fazer health check
    const canCheckDefault = await this.healthRepository.canCheckHealth(ProcessorType.default());
    
    if (canCheckDefault) {
      // 2. Fazer health check ativo
      const healthStatus = await this.performHealthCheck(defaultProcessor);
      
      // 3. Usar policy de domínio para decidir
      return ProcessorSelectionPolicy.selectProcessor({
        defaultProcessor,
        fallbackProcessor,
        defaultHealth: healthStatus
      });
    } else {
      // 4. Usar health cache se disponível
      const cachedHealth = await this.healthRepository.getHealthStatus(ProcessorType.default());
      
      // 5. Aplicar policy com dados cached
      return ProcessorSelectionPolicy.selectProcessor({
        defaultProcessor,
        fallbackProcessor,
        defaultHealth: cachedHealth || undefined
      });
    }
  }

  private async performHealthCheck(processor: ProcessorConfig) {
    try {
      this.logger.debug("Performing health check", { 
        processor: processor.name,
        operation: "health_check_start"
      });

      const health = await this.paymentProcessorService.checkHealth(processor);
      
      const healthStatus = {
        failing: health.failing,
        minResponseTime: health.minResponseTime,
        lastChecked: new Date()
      };

      // Salvar resultado no cache
      await this.healthRepository.setHealthStatus(ProcessorType.default(), healthStatus);
      
      this.logger.debug("Health check completed", {
        processor: processor.name,
        failing: health.failing,
        minResponseTime: health.minResponseTime,
        operation: "health_check_success"
      });

      return healthStatus;
    } catch (error) {
      this.logger.error("Health check failed", error as Error, {
        processor: processor.name,
        operation: "health_check_failure"
      });

      const failedHealthStatus = {
        failing: true,
        minResponseTime: 0,
        lastChecked: new Date()
      };

      // Marcar como falhando no cache
      await this.healthRepository.setHealthStatus(ProcessorType.default(), failedHealthStatus);
      
      return failedHealthStatus;
    }
  }
}