import { ErrorCode } from "@/shared/enums/payment-enums";
import { ConflictError, InternalError } from "@/shared/errors/app-error";
import { Result } from "@/shared/result/result";
import { Payment } from "@/domain/entities/payment";
import { PaymentRepository } from "@/domain/repositories/payment-repository";
import { CorrelationId } from "@/domain/value-objects/correlation-id";
import { Money } from "@/domain/value-objects/money";
import { BaseUseCase } from "@/application/base/base-use-case";
import { PaymentQueue } from "@/infrastructure/queue/payment-queue";

export interface SubmitPaymentRequest {
  correlationId: CorrelationId;
  amount: Money;
}

export class SubmitPaymentUseCase extends BaseUseCase<SubmitPaymentRequest, Payment> {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentQueue: PaymentQueue
  ) {
    super("submit-payment-use-case");
  }

  protected async executeImpl(request: SubmitPaymentRequest): Promise<Result<Payment, Error>> {
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

    // Criar novo pagamento com status PENDING
    const payment = Payment.create(correlationId, amount);
    
    this.logBusinessEvent("payment_submitted", {
      correlationId: correlationId.value,
      amount: amount.value,
      status: payment.status
    });

    // Salvar pagamento com status PENDING
    await this.paymentRepository.save(payment);
    
    // Adicionar job na fila para processamento assíncrono
    await this.paymentQueue.addPaymentJob(correlationId, amount);
    
    this.logBusinessEvent("payment_job_queued", {
      correlationId: correlationId.value,
      amount: amount.value
    });

    return Result.ok(payment);
  }

  protected handleUnexpectedError(_error: Error): Result<Payment, Error> {
    return Result.fail(
      new InternalError(
        "Unexpected error during payment submission",
        ErrorCode.PAYMENT_PROCESSING_FAILED
      )
    );
  }

  protected sanitizeRequest(request: SubmitPaymentRequest): any {
    return {
      correlationId: request.correlationId.value,
      amount: request.amount.value
    };
  }
}