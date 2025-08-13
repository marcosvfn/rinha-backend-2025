import { APP_CONSTANTS } from '../../shared/constants/app-constants';
import { ValidationError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/enums/payment-enums';

export class CorrelationId {
  private readonly _value: string;

  constructor(value: string) {
    this.validate(value);
    this._value = value;
  }

  private validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(
        'CorrelationId cannot be empty',
        ErrorCode.INVALID_CORRELATION_ID
      );
    }

    if (!APP_CONSTANTS.VALIDATION.UUID_REGEX.test(value)) {
      throw new ValidationError(
        'CorrelationId must be a valid UUID',
        ErrorCode.INVALID_CORRELATION_ID
      );
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: CorrelationId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static create(value: string): CorrelationId {
    return new CorrelationId(value);
  }
}