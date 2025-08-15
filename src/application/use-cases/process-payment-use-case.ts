import { ErrorCode } from "../../shared/enums/payment-enums";
import {
  ConflictError,
  InternalError,
  ServiceUnavailableError,
} from "../../shared/errors/app-error";
import { Result } from "../../shared/result/result";
import { Payment, ProcessorConfig } from "../../domain/entities/payment";
import { PaymentRepository } from "../../domain/repositories/payment-repository";
import { HealthRepository } from "../../domain/repositories/health-repository";
import { CorrelationId } from "../../domain/value-objects/correlation-id";
import { Money } from "../../domain/value-objects/money";
import { ProcessorType } from "../../domain/value-objects/processor-type";
import { PaymentProcessorService } from "../../domain/services/payment-processor-service";
import { ProcessorOrchestrationService } from "../services/processor-orchestration-service";
import { BaseUseCase } from "../base/base-use-case";

export interface ProcessPaymentRequest {
  correlationId: CorrelationId;
  amount: Money;
}

export class ProcessPaymentUseCase extends BaseUseCase<ProcessPaymentRequest, Payment> {
  private processorOrchestrationService: ProcessorOrchestrationService;

  constructor(
    private paymentRepository: PaymentRepository,
    private healthRepository: HealthRepository,
    private paymentProcessorService: PaymentProcessorService,
    private processorConfigs: Map<string, ProcessorConfig>
  ) {
    super("process-payment-use-case");
    this.processorOrchestrationService = new ProcessorOrchestrationService(
      healthRepository,
      paymentProcessorService,
      processorConfigs
    );
  }

  protected async executeImpl(request: ProcessPaymentRequest): Promise<Result<Payment, Error>> {
    const { correlationId, amount } = request;

    // Verificar se pagamento já existe
    const existingPayment = await this.paymentRepository.findByCorrelationId(correlationId);
    if (existingPayment) {
      this.logBusinessEvent("duplicate_payment_detected", {
        correlationId: correlationId.value
      });
      
      return Result.fail(
        new ConflictError(
          "Payment with this correlation ID already exists",
          ErrorCode.PAYMENT_ALREADY_EXISTS
        )
      );
    }

    // Criar novo pagamento
    const payment = Payment.create(correlationId, amount);
    
    this.logBusinessEvent("payment_created", {
      correlationId: correlationId.value,
      amount: amount.value
    });

    // Selecionar melhor processador
    const processor = await this.processorOrchestrationService.selectBestProcessor();
    
    this.logBusinessEvent("processor_selected", {
      correlationId: correlationId.value,
      processor: processor.name
    });

    // Processar pagamento com fallback
    const processResult = await this.processWithFallback(payment, processor);
    
    if (processResult.isFailure) {
      return Result.fail(processResult.getError());
    }

    // Salvar pagamento
    await this.paymentRepository.save(payment);
    
    this.logBusinessEvent("payment_saved", {
      correlationId: correlationId.value,
      status: payment.status,
      processor: payment.processor.value
    });

    return Result.ok(payment);
  }

  protected handleUnexpectedError(_error: Error): Result<Payment, Error> {
    return Result.fail(
      new InternalError(
        "Unexpected error during payment processing",
        ErrorCode.PAYMENT_PROCESSING_FAILED
      )
    );
  }

  protected sanitizeRequest(request: ProcessPaymentRequest): any {
    return {
      correlationId: request.correlationId.value,
      amount: request.amount.value
    };
  }

  private async processWithFallback(
    payment: Payment,
    primaryProcessor: ProcessorConfig
  ): Promise<Result<void, Error>> {
    try {
      const success = await this.paymentProcessorService.processPayment(
        payment,
        primaryProcessor
      );

      if (success) {
        payment.markAsProcessed(
          ProcessorType.create(primaryProcessor.name),
          primaryProcessor.fee
        );
        
        this.logBusinessEvent("payment_processed_successfully", {
          correlationId: payment.correlationId.value,
          processor: primaryProcessor.name
        });
        
        return Result.ok(undefined);
      }
    } catch (error) {
      this.logger.error(
        `Primary processor ${primaryProcessor.name} failed`,
        error as Error,
        {
          processor: primaryProcessor.name,
          correlationId: payment.correlationId.value,
          operation: "primary_processor_failure",
        }
      );
    }

    // Tentar fallback se primary era default
    if (primaryProcessor.name === "default") {
      const fallbackProcessor = this.processorConfigs.get("fallback")!;
      
      this.logBusinessEvent("processor_fallback_triggered", {
        correlationId: payment.correlationId.value,
        fromProcessor: primaryProcessor.name,
        toProcessor: fallbackProcessor.name
      });
      
      try {
        const fallbackSuccess = await this.paymentProcessorService.processPayment(
          payment,
          fallbackProcessor
        );

        if (fallbackSuccess) {
          payment.markAsProcessed(
            ProcessorType.fallback(),
            fallbackProcessor.fee
          );
          
          this.logBusinessEvent("payment_processed_via_fallback", {
            correlationId: payment.correlationId.value,
            processor: fallbackProcessor.name
          });
          
          return Result.ok(undefined);
        }
      } catch (fallbackError) {
        this.logger.error(
          "Fallback processor also failed",
          fallbackError as Error,
          {
            processor: fallbackProcessor.name,
            correlationId: payment.correlationId.value,
            operation: "fallback_processor_failure",
          }
        );
      }
    }

    payment.markAsFailed();
    
    this.logBusinessEvent("payment_processing_failed", {
      correlationId: payment.correlationId.value,
      primaryProcessor: primaryProcessor.name
    });
    
    return Result.fail(
      new ServiceUnavailableError(
        "All payment processors are currently unavailable",
        ErrorCode.PROCESSOR_UNAVAILABLE
      )
    );
  }
}