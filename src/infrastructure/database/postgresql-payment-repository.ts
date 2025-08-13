import { Pool } from 'pg';
import { Payment, PaymentSummary } from '../../domain/entities/payment';
import { PaymentRepository } from '../../domain/repositories/payment-repository';
import { CorrelationId } from '../../domain/value-objects/correlation-id';
import { Money } from '../../domain/value-objects/money';
import { ProcessorType } from '../../domain/value-objects/processor-type';
import { PaymentStatus, ProcessorType as ProcessorTypeEnum } from '../../shared/enums/payment-enums';
import { LoggerService } from '../../shared/logging';

export class PostgreSQLPaymentRepository implements PaymentRepository {
  private logger: LoggerService;

  constructor(private pool: Pool) {
    this.logger = new LoggerService('postgresql-payment-repository');
  }

  async save(payment: Payment): Promise<void> {
    const startTime = Date.now();
    
    const query = `
      INSERT INTO payments (correlation_id, amount, requested_at, processor, status, processed_at, fee)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (correlation_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        processed_at = EXCLUDED.processed_at,
        fee = EXCLUDED.fee,
        processor = EXCLUDED.processor
    `;

    try {
      await this.pool.query(query, [
        payment.correlationId.value,
        payment.amount.value,
        payment.requestedAt,
        payment.processor.value,
        payment.status,
        payment.processedAt,
        payment.fee?.value
      ]);
      
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation('save', 'payments', duration, true);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation('save', 'payments', duration, false, error as Error);
      throw error;
    }
  }

  async findByCorrelationId(correlationId: CorrelationId): Promise<Payment | null> {
    const startTime = Date.now();
    
    try {
      const query = 'SELECT * FROM payments WHERE correlation_id = $1';
      const result = await this.pool.query(query, [correlationId.value]);
      
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation('find', 'payments', duration, true);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return Payment.restore(
        CorrelationId.create(row.correlation_id),
        Money.create(parseFloat(row.amount)),
        row.requested_at,
        ProcessorType.create(row.processor),
        row.status as PaymentStatus,
        row.processed_at,
        row.fee ? Money.create(parseFloat(row.fee)) : undefined
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation('find', 'payments', duration, false, error as Error);
      throw error;
    }
  }

  async getSummary(from?: Date, to?: Date): Promise<PaymentSummary> {
    const defaultStats = await this.getProcessorStats(ProcessorType.default(), from, to);
    const fallbackStats = await this.getProcessorStats(ProcessorType.fallback(), from, to);

    return {
      default: {
        totalRequests: defaultStats.count,
        totalAmount: defaultStats.sum
      },
      fallback: {
        totalRequests: fallbackStats.count,
        totalAmount: fallbackStats.sum
      }
    };
  }

  async countByProcessor(processor: ProcessorType, from?: Date, to?: Date): Promise<number> {
    let query = 'SELECT COUNT(*) FROM payments WHERE processor = $1 AND status = $2';
    const params: any[] = [processor.value, PaymentStatus.PROCESSED];

    if (from && to) {
      query += ' AND requested_at >= $3 AND requested_at <= $4';
      params.push(from, to);
    } else if (from) {
      query += ' AND requested_at >= $3';
      params.push(from);
    } else if (to) {
      query += ' AND requested_at <= $3';
      params.push(to);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async sumAmountByProcessor(processor: ProcessorType, from?: Date, to?: Date): Promise<number> {
    let query = 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE processor = $1 AND status = $2';
    const params: any[] = [processor.value, PaymentStatus.PROCESSED];

    if (from && to) {
      query += ' AND requested_at >= $3 AND requested_at <= $4';
      params.push(from, to);
    } else if (from) {
      query += ' AND requested_at >= $3';
      params.push(from);
    } else if (to) {
      query += ' AND requested_at <= $3';
      params.push(to);
    }

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].total);
  }

  private async getProcessorStats(processor: ProcessorType, from?: Date, to?: Date): Promise<{ count: number; sum: number }> {
    const count = await this.countByProcessor(processor, from, to);
    const sum = await this.sumAmountByProcessor(processor, from, to);
    return { count, sum };
  }
}