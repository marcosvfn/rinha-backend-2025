import { CorrelationId } from "@/domain/value-objects/correlation-id";
import { Money } from "@/domain/value-objects/money";
import { ErrorCode } from "@/shared/enums/payment-enums";
import { ValidationError } from "@/shared/errors/app-error";

export interface PaymentInput {
  correlationId: string;
  amount: number;
}

export interface DateRangeInput {
  from?: string;
  to?: string;
}

export class PaymentValidator {
  static validatePaymentInput(input: PaymentInput): {
    correlationId: CorrelationId;
    amount: Money;
  } {
    if (!input.correlationId || !input.amount) {
      throw new ValidationError(
        "Missing required fields: correlationId and amount",
        ErrorCode.INVALID_CORRELATION_ID
      );
    }

    const correlationId = CorrelationId.create(input.correlationId);
    const amount = Money.create(input.amount);

    return { correlationId, amount };
  }

  static validateDateRange(input: DateRangeInput): {
    from?: Date;
    to?: Date;
  } {
    const result: { from?: Date; to?: Date } = {};

    if (input.from) {
      const fromDate = new Date(input.from);
      if (isNaN(fromDate.getTime())) {
        throw new ValidationError(
          "Invalid from date format",
          ErrorCode.INVALID_DATE_RANGE
        );
      }
      result.from = fromDate;
    }

    if (input.to) {
      const toDate = new Date(input.to);
      if (isNaN(toDate.getTime())) {
        throw new ValidationError(
          "Invalid to date format",
          ErrorCode.INVALID_DATE_RANGE
        );
      }
      result.to = toDate;
    }

    if (result.from && result.to && result.from > result.to) {
      throw new ValidationError(
        "From date cannot be greater than to date",
        ErrorCode.INVALID_DATE_RANGE
      );
    }

    return result;
  }
}
