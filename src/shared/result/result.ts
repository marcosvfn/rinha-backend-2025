export abstract class Result<T, E = Error> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;

  protected constructor(isSuccess: boolean) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
  }

  public static ok<T>(value: T): Success<T> {
    return new Success<T>(value);
  }

  public static fail<E>(error: E): Failure<E> {
    return new Failure<E>(error);
  }

  public abstract getValue(): T;
  public abstract getError(): E;
}

export class Success<T> extends Result<T> {
  private readonly _value: T;

  constructor(value: T) {
    super(true);
    this._value = value;
  }

  public getValue(): T {
    return this._value;
  }

  public getError(): never {
    throw new Error("Cannot get error from success result");
  }
}

export class Failure<E> extends Result<never, E> {
  private readonly _error: E;

  constructor(error: E) {
    super(false);
    this._error = error;
  }

  public getValue(): never {
    throw new Error("Cannot get value from failure result");
  }

  public getError(): E {
    return this._error;
  }
}
