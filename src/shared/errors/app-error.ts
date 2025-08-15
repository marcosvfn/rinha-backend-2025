import { ErrorCode, HttpStatusCode } from "../enums/payment-enums";

export abstract class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: HttpStatusCode,
    errorCode: ErrorCode,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.errorCode,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, HttpStatusCode.BAD_REQUEST, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, HttpStatusCode.CONFLICT, errorCode);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, HttpStatusCode.SERVICE_UNAVAILABLE, errorCode);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, HttpStatusCode.TOO_MANY_REQUESTS, errorCode);
  }
}

export class InternalError extends AppError {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, HttpStatusCode.INTERNAL_SERVER_ERROR, errorCode);
  }
}
