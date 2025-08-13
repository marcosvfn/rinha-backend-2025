export interface CreatePaymentDTO {
  correlationId: string;
  amount: number;
}

export interface PaymentSummaryDTO {
  default: {
    totalRequests: number;
    totalAmount: number;
  };
  fallback: {
    totalRequests: number;
    totalAmount: number;
  };
}

export interface PaymentSummaryQueryDTO {
  from?: string;
  to?: string;
}