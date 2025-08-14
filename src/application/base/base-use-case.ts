import { LoggerService } from "@/shared/logging";
import { Result } from "@/shared/result/result";

export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<Result<TResponse, Error>>;
}

export abstract class BaseUseCase<TRequest, TResponse> implements UseCase<TRequest, TResponse> {
  protected readonly logger: LoggerService;
  protected readonly useCaseName: string;

  constructor(useCaseName: string) {
    this.useCaseName = useCaseName;
    this.logger = new LoggerService(useCaseName);
  }

  async execute(request: TRequest): Promise<Result<TResponse, Error>> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`${this.useCaseName} execution started`, {
        operation: `${this.useCaseName}_start`,
        request: this.sanitizeRequest(request)
      });

      const result = await this.executeImpl(request);
      
      const duration = Date.now() - startTime;
      
      if (result.isSuccess) {
        this.logger.info(`${this.useCaseName} execution completed successfully`, {
          operation: `${this.useCaseName}_success`,
          duration
        });
        
        this.logger.logPerformanceMetrics({
          operation: this.useCaseName,
          duration,
          success: true
        });
      } else {
        this.logger.warn(`${this.useCaseName} execution failed`, {
          operation: `${this.useCaseName}_failure`,
          duration,
          error: result.getError().message
        });
        
        this.logger.logPerformanceMetrics({
          operation: this.useCaseName,
          duration,
          success: false
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`${this.useCaseName} execution threw unexpected error`, error as Error, {
        operation: `${this.useCaseName}_error`,
        duration
      });
      
      this.logger.logPerformanceMetrics({
        operation: this.useCaseName,
        duration,
        success: false
      });
      
      return this.handleUnexpectedError(error as Error);
    }
  }

  protected abstract executeImpl(request: TRequest): Promise<Result<TResponse, Error>>;

  protected abstract handleUnexpectedError(error: Error): Result<TResponse, Error>;

  protected sanitizeRequest(request: TRequest): any {
    // Por padrão, não loggar o request completo por segurança
    // Subclasses podem sobrescrever para loggar campos específicos
    return "[request-sanitized]";
  }

  protected logBusinessEvent(event: string, context?: Record<string, any>): void {
    this.logger.info(event, {
      operation: "business_event",
      useCase: this.useCaseName,
      ...context
    });
  }
}