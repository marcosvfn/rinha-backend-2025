import axios, { AxiosInstance } from "axios";
import { Payment, ProcessorConfig } from "@/domain/entities/payment";
import { PaymentProcessorService } from "@/domain/services/payment-processor-service";
import { LoggerService } from "@/shared/logging";
import { APP_CONSTANTS } from "@/shared/constants/app-constants";

export class HttpPaymentProcessorService implements PaymentProcessorService {
  private httpClient: AxiosInstance;
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService("http-payment-processor-service");
    
    this.httpClient = axios.create({
      timeout: APP_CONSTANTS.HTTP.REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async processPayment(payment: Payment, processor: ProcessorConfig): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.logger.debug("Sending payment to processor", {
        processor: processor.name,
        correlationId: payment.correlationId.value,
        amount: payment.amount.value,
        url: processor.url,
        operation: "payment_processor_request"
      });
      
      const response = await this.httpClient.post(`${processor.url}/payments`, {
        correlationId: payment.correlationId.value,
        amount: payment.amount.value,
        requestedAt: payment.requestedAt.toISOString()
      });
      
      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;
      
      this.logger.info("Payment processor response received", {
        processor: processor.name,
        correlationId: payment.correlationId.value,
        statusCode: response.status,
        duration,
        success,
        operation: "payment_processor_response"
      });
      
      this.logger.logPerformanceMetrics({
        operation: "payment_processor_call",
        duration,
        success,
        processor: processor.name
      });

      return success;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Payment processing failed for processor ${processor.name}`, error as Error, {
        processor: processor.name,
        correlationId: payment.correlationId.value,
        duration,
        operation: "payment_processor_error"
      });
      
      this.logger.logPerformanceMetrics({
        operation: "payment_processor_call",
        duration,
        success: false,
        processor: processor.name
      });
      
      return false;
    }
  }

  async checkHealth(processor: ProcessorConfig): Promise<{ failing: boolean; minResponseTime: number }> {
    const startTime = Date.now();
    
    try {
      this.logger.debug("Checking processor health", {
        processor: processor.name,
        url: processor.url,
        operation: "health_check_request"
      });
      
      const response = await this.httpClient.get(`${processor.url}/payments/service-health`);
      const duration = Date.now() - startTime;
      
      if (response.status === 429) {
        this.logger.warn("Health check rate limited", {
          processor: processor.name,
          duration,
          operation: "health_check_rate_limited"
        });
        throw new Error("Rate limit exceeded");
      }
      
      const healthData = {
        failing: response.data.failing || false,
        minResponseTime: response.data.minResponseTime || 0
      };
      
      this.logger.logHealthCheck(
        processor.name,
        healthData.failing,
        healthData.minResponseTime
      );
      
      this.logger.logPerformanceMetrics({
        operation: "health_check",
        duration,
        success: true,
        processor: processor.name
      });

      return healthData;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Health check failed for processor ${processor.name}`, error as Error, {
        processor: processor.name,
        duration,
        operation: "health_check_error"
      });
      
      this.logger.logPerformanceMetrics({
        operation: "health_check",
        duration,
        success: false,
        processor: processor.name
      });
      
      throw error;
    }
  }
}