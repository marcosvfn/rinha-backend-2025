import { Payment, ProcessorConfig } from "@/domain/entities/payment";

export interface PaymentProcessorService {
  processPayment(payment: Payment, processor: ProcessorConfig): Promise<boolean>;
  checkHealth(processor: ProcessorConfig): Promise<{ failing: boolean; minResponseTime: number }>;
}