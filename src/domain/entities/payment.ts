import { CorrelationId } from '../value-objects/correlation-id';
import { Money } from '../value-objects/money';
import { ProcessorType } from '../value-objects/processor-type';
import { PaymentStatus } from '../../shared/enums/payment-enums';

export class Payment {
  private constructor(
    private readonly _correlationId: CorrelationId,
    private readonly _amount: Money,
    private readonly _requestedAt: Date,
    private _processor: ProcessorType,
    private _status: PaymentStatus,
    private _processedAt?: Date,
    private _fee?: Money
  ) {}

  get correlationId(): CorrelationId {
    return this._correlationId;
  }

  get amount(): Money {
    return this._amount;
  }

  get requestedAt(): Date {
    return this._requestedAt;
  }

  get processor(): ProcessorType {
    return this._processor;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get processedAt(): Date | undefined {
    return this._processedAt;
  }

  get fee(): Money | undefined {
    return this._fee;
  }

  markAsProcessed(processor: ProcessorType, feeRate: number): void {
    this._status = PaymentStatus.PROCESSED;
    this._processor = processor;
    this._processedAt = new Date();
    this._fee = this._amount.calculateFee(feeRate);
  }

  markAsFailed(): void {
    this._status = PaymentStatus.FAILED;
  }

  updateProcessor(processor: ProcessorType): void {
    this._processor = processor;
  }

  isProcessed(): boolean {
    return this._status === PaymentStatus.PROCESSED;
  }

  isFailed(): boolean {
    return this._status === PaymentStatus.FAILED;
  }

  isPending(): boolean {
    return this._status === PaymentStatus.PENDING;
  }

  static create(
    correlationId: CorrelationId,
    amount: Money
  ): Payment {
    return new Payment(
      correlationId,
      amount,
      new Date(),
      ProcessorType.default(),
      PaymentStatus.PENDING
    );
  }

  static restore(
    correlationId: CorrelationId,
    amount: Money,
    requestedAt: Date,
    processor: ProcessorType,
    status: PaymentStatus,
    processedAt?: Date,
    fee?: Money
  ): Payment {
    return new Payment(
      correlationId,
      amount,
      requestedAt,
      processor,
      status,
      processedAt,
      fee
    );
  }
}

export interface PaymentSummary {
  default: {
    totalRequests: number;
    totalAmount: number;
  };
  fallback: {
    totalRequests: number;
    totalAmount: number;
  };
}

export interface ProcessorHealthStatus {
  failing: boolean;
  minResponseTime: number;
  lastChecked: Date;
}

export interface ProcessorConfig {
  name: 'default' | 'fallback';
  url: string;
  fee: number;
}