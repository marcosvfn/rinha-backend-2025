import { Request, Response } from 'express';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment-use-case';
import { GetPaymentSummaryUseCase } from '../../application/use-cases/get-payment-summary-use-case';
import { CreatePaymentDTO, PaymentSummaryQueryDTO } from '../dto/payment-dto';
import { PaymentValidator } from '../../shared/validators/payment-validator';
import { AppError } from '../../shared/errors/app-error';
import { HttpStatusCode } from '../../shared/enums/payment-enums';
import { LoggerService } from '../../shared/logging';

export class PaymentController {
  private logger: LoggerService;

  constructor(
    private processPaymentUseCase: ProcessPaymentUseCase,
    private getPaymentSummaryUseCase: GetPaymentSummaryUseCase
  ) {
    this.logger = new LoggerService('payment-controller');
  }

  async createPayment(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`;
    
    try {
      const paymentData: CreatePaymentDTO = req.body;
      
      this.logger.info('Payment request received', {
        requestId,
        correlationId: paymentData.correlationId,
        amount: paymentData.amount,
        userAgent: req.headers['user-agent'],
        operation: 'payment_request'
      });
      
      const { correlationId, amount } = PaymentValidator.validatePaymentInput(paymentData);
      
      const result = await this.processPaymentUseCase.execute({ correlationId, amount });
      
      const duration = Date.now() - startTime;
      
      if (result.isFailure) {
        const error = result.getError();
        
        this.logger.logHttpRequest(
          req.method,
          req.originalUrl,
          error instanceof AppError ? error.statusCode : HttpStatusCode.INTERNAL_SERVER_ERROR,
          duration,
          req.headers['user-agent'] as string
        );
        
        if (error instanceof AppError) {
          res.status(error.statusCode).json(error.toJSON());
          return;
        }
        
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          error: { message: 'Internal server error' }
        });
        return;
      }
      
      this.logger.logHttpRequest(
        req.method,
        req.originalUrl,
        HttpStatusCode.OK,
        duration,
        req.headers['user-agent'] as string
      );
      
      res.status(HttpStatusCode.OK).json({ message: 'Payment processed successfully' });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('Error processing payment', error as Error, {
        requestId,
        duration,
        operation: 'payment_controller_error'
      });
      
      this.logger.logHttpRequest(
        req.method,
        req.originalUrl,
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        duration,
        req.headers['user-agent'] as string
      );
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }

      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Internal server error' }
      });
    }
  }

  async getPaymentSummary(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`;
    
    try {
      const query: PaymentSummaryQueryDTO = req.query as any;
      
      this.logger.info('Payment summary request received', {
        requestId,
        from: query.from,
        to: query.to,
        operation: 'payment_summary_request'
      });
      
      const { from, to } = PaymentValidator.validateDateRange(query);
      
      const summaryResult = await this.getPaymentSummaryUseCase.execute({
        from: from?.toISOString(),
        to: to?.toISOString()
      });
      
      if (summaryResult.isFailure) {
        const error = summaryResult.getError();
        if (error instanceof AppError) {
          res.status(error.statusCode).json(error.toJSON());
          return;
        }
        
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          error: { message: 'Internal server error' }
        });
        return;
      }
      
      const summary = summaryResult.getValue();
      
      const duration = Date.now() - startTime;
      
      this.logger.logHttpRequest(
        req.method,
        req.originalUrl,
        HttpStatusCode.OK,
        duration,
        req.headers['user-agent'] as string
      );
      
      this.logger.info('Payment summary generated', {
        requestId,
        duration,
        defaultRequests: summary.default.totalRequests,
        fallbackRequests: summary.fallback.totalRequests,
        operation: 'payment_summary_success'
      });
      
      res.status(HttpStatusCode.OK).json(summary);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('Error getting payment summary', error as Error, {
        requestId,
        duration,
        operation: 'payment_summary_error'
      });
      
      this.logger.logHttpRequest(
        req.method,
        req.originalUrl,
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        duration,
        req.headers['user-agent'] as string
      );
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }

      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Internal server error' }
      });
    }
  }
}