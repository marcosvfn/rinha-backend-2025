import { Payment, PaymentSummary } from '../entities/payment';
import { CorrelationId } from '../value-objects/correlation-id';
import { ProcessorType } from '../value-objects/processor-type';

export interface PaymentRepository {
  save(payment: Payment): Promise<void>;
  findByCorrelationId(correlationId: CorrelationId): Promise<Payment | null>;
  getSummary(from?: Date, to?: Date): Promise<PaymentSummary>;
  countByProcessor(processor: ProcessorType, from?: Date, to?: Date): Promise<number>;
  sumAmountByProcessor(processor: ProcessorType, from?: Date, to?: Date): Promise<number>;
}