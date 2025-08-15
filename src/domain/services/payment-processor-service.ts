import { Payment, ProcessorConfig } from "../entities/payment";

export interface PaymentProcessorService {
  processPayment(payment: Payment, processor: ProcessorConfig): Promise<boolean>;
  checkHealth(processor: ProcessorConfig): Promise<{ failing: boolean; minResponseTime: number }>;
}