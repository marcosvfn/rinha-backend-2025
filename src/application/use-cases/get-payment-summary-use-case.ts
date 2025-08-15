import { PaymentSummary } from "../../domain/entities/payment";
import { PaymentRepository } from "../../domain/repositories/payment-repository";
import { BaseUseCase } from "../base/base-use-case";
import { Result } from "../../shared/result/result";
import { InternalError } from "../../shared/errors/app-error";
import { ErrorCode } from "../../shared/enums/payment-enums";

export interface GetPaymentSummaryRequest {
  from?: string;
  to?: string;
}

export class GetPaymentSummaryUseCase extends BaseUseCase<GetPaymentSummaryRequest, PaymentSummary> {
  constructor(private paymentRepository: PaymentRepository) {
    super("get-payment-summary-use-case");
  }

  protected async executeImpl(request: GetPaymentSummaryRequest): Promise<Result<PaymentSummary, Error>> {
    const { from, to } = request;
    
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    this.logBusinessEvent("payment_summary_requested", {
      from,
      to,
      hasDateFilter: !!(from || to)
    });

    const summary = await this.paymentRepository.getSummary(fromDate, toDate);

    this.logBusinessEvent("payment_summary_generated", {
      defaultRequests: summary.default.totalRequests,
      defaultAmount: summary.default.totalAmount,
      fallbackRequests: summary.fallback.totalRequests,
      fallbackAmount: summary.fallback.totalAmount,
      totalRequests: summary.default.totalRequests + summary.fallback.totalRequests,
      totalAmount: summary.default.totalAmount + summary.fallback.totalAmount
    });

    return Result.ok(summary);
  }

  protected handleUnexpectedError(error: Error): Result<PaymentSummary, Error> {
    return Result.fail(
      new InternalError(
        "Unexpected error while getting payment summary",
        ErrorCode.PAYMENT_PROCESSING_FAILED
      )
    );
  }

  protected sanitizeRequest(request: GetPaymentSummaryRequest): any {
    return {
      from: request.from || null,
      to: request.to || null
    };
  }
}