import { Logger } from "winston";
import { AppError } from "../errors/app-error";
import { createLogger } from "./logger-config";

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  operationId?: string;
  processor?: string;
  amount?: number;
  duration?: number;
  [key: string]: any;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  processor?: string;
  errorCode?: string;
}

export class LoggerService {
  private logger: Logger;

  constructor(service: string = "payment-processor") {
    this.logger = createLogger(service);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  error(message: string, error?: Error | AppError, context?: LogContext): void {
    const errorContext = this.buildErrorContext(error, context);
    this.logger.error(message, errorContext);
  }

  logPaymentAttempt(
    correlationId: string,
    amount: number,
    processor: string
  ): void {
    this.info("Payment processing started", {
      correlationId,
      amount,
      processor,
      operation: "payment_attempt",
    });
  }

  logPaymentSuccess(
    correlationId: string,
    amount: number,
    processor: string,
    duration: number
  ): void {
    this.info("Payment processed successfully", {
      correlationId,
      amount,
      processor,
      duration,
      operation: "payment_success",
    });
  }

  logPaymentFailure(
    correlationId: string,
    amount: number,
    processor: string,
    error: Error,
    duration: number
  ): void {
    this.error("Payment processing failed", error, {
      correlationId,
      amount,
      processor,
      duration,
      operation: "payment_failure",
    });
  }

  logHealthCheck(
    processor: string,
    failing: boolean,
    responseTime: number
  ): void {
    const level = failing ? "warn" : "debug";
    this.logger[level]("Health check completed", {
      processor,
      failing,
      responseTime,
      operation: "health_check",
    });
  }

  logProcessorFallback(
    correlationId: string,
    fromProcessor: string,
    toProcessor: string,
    reason: string
  ): void {
    this.warn("Processor fallback triggered", {
      correlationId,
      fromProcessor,
      toProcessor,
      reason,
      operation: "processor_fallback",
    });
  }

  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    const message = `Database ${operation} ${success ? "completed" : "failed"}`;
    const context = {
      operation: `db_${operation}`,
      table,
      duration,
      success,
    };

    if (success) {
      this.debug(message, context);
    } else {
      this.error(message, error, context);
    }
  }

  logCacheOperation(
    operation: string,
    key: string,
    hit: boolean,
    duration: number
  ): void {
    this.debug(`Cache ${operation}`, {
      operation: `cache_${operation}`,
      key,
      hit,
      duration,
    });
  }

  logPerformanceMetrics(metrics: PerformanceMetrics): void {
    const { operation, duration, success, ...meta } = metrics;

    if (duration > 1000) {
      this.warn(`Slow operation detected: ${operation}`, {
        operation: "performance_warning",
        duration,
        success,
        ...meta,
      });
    } else {
      this.debug(`Performance: ${operation}`, {
        operation: "performance_metric",
        duration,
        success,
        ...meta,
      });
    }
  }

  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userAgent?: string
  ): void {
    const level = statusCode >= 400 ? "warn" : "info";
    this.logger[level]("HTTP Request", {
      method,
      url,
      statusCode,
      duration,
      userAgent,
      operation: "http_request",
    });
  }

  logSystemStartup(port: number, environment: string): void {
    this.info("Application started successfully", {
      port,
      environment,
      operation: "system_startup",
    });
  }

  logSystemShutdown(reason: string): void {
    this.info("Application shutting down", {
      reason,
      operation: "system_shutdown",
    });
  }

  logConfigurationLoad(service: string, configCount: number): void {
    this.info("Configuration loaded", {
      service,
      configCount,
      operation: "config_load",
    });
  }

  private buildErrorContext(
    error?: Error | AppError,
    context?: LogContext
  ): LogContext {
    const baseContext = context || {};

    if (!error) {
      return baseContext;
    }

    const errorContext: LogContext = {
      ...baseContext,
      errorMessage: error.message,
      errorStack: error.stack,
    };

    if (error instanceof AppError) {
      errorContext.errorCode = error.errorCode;
      errorContext.statusCode = error.statusCode;
      errorContext.isOperational = error.isOperational;
    }

    return errorContext;
  }

  createChild(additionalContext: LogContext): LoggerService {
    const childLogger = new LoggerService();
    childLogger.logger = this.logger.child(additionalContext);
    return childLogger;
  }
}
