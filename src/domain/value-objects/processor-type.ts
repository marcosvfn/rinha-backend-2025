import { ProcessorType as ProcessorTypeEnum } from '../../shared/enums/payment-enums';
import { ValidationError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/enums/payment-enums';

export class ProcessorType {
  private readonly _value: ProcessorTypeEnum;

  constructor(value: string) {
    this.validate(value);
    this._value = value as ProcessorTypeEnum;
  }

  private validate(value: string): void {
    if (!Object.values(ProcessorTypeEnum).includes(value as ProcessorTypeEnum)) {
      throw new ValidationError(
        `Invalid processor type: ${value}`,
        ErrorCode.PROCESSOR_UNAVAILABLE
      );
    }
  }

  get value(): ProcessorTypeEnum {
    return this._value;
  }

  isDefault(): boolean {
    return this._value === ProcessorTypeEnum.DEFAULT;
  }

  isFallback(): boolean {
    return this._value === ProcessorTypeEnum.FALLBACK;
  }

  equals(other: ProcessorType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static default(): ProcessorType {
    return new ProcessorType(ProcessorTypeEnum.DEFAULT);
  }

  static fallback(): ProcessorType {
    return new ProcessorType(ProcessorTypeEnum.FALLBACK);
  }

  static create(value: string): ProcessorType {
    return new ProcessorType(value);
  }
}