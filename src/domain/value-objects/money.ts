import { APP_CONSTANTS } from "../../shared/constants/app-constants";
import { ValidationError } from "../../shared/errors/app-error";
import { ErrorCode } from "../../shared/enums/payment-enums";

export class Money {
  private readonly _amount: number;

  constructor(amount: number) {
    this.validate(amount);
    this._amount = this.roundToTwoDecimals(amount);
  }

  private validate(amount: number): void {
    if (typeof amount !== "number" || isNaN(amount)) {
      throw new ValidationError(
        "Amount must be a valid number",
        ErrorCode.INVALID_AMOUNT
      );
    }

    if (amount < APP_CONSTANTS.VALIDATION.MIN_AMOUNT) {
      throw new ValidationError(
        `Amount must be at least ${APP_CONSTANTS.VALIDATION.MIN_AMOUNT}`,
        ErrorCode.INVALID_AMOUNT
      );
    }

    if (amount > APP_CONSTANTS.VALIDATION.MAX_AMOUNT) {
      throw new ValidationError(
        `Amount cannot exceed ${APP_CONSTANTS.VALIDATION.MAX_AMOUNT}`,
        ErrorCode.INVALID_AMOUNT
      );
    }
  }

  private roundToTwoDecimals(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  get value(): number {
    return this._amount;
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount);
  }

  subtract(other: Money): Money {
    return new Money(this._amount - other._amount);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor);
  }

  calculateFee(feeRate: number): Money {
    return new Money(this._amount * feeRate);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount;
  }

  isGreaterThan(other: Money): boolean {
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    return this._amount < other._amount;
  }

  toString(): string {
    return this._amount.toFixed(2);
  }

  static create(amount: number): Money {
    return new Money(amount);
  }

  static zero(): Money {
    return new Money(0);
  }
}