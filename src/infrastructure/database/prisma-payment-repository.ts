import { PrismaClient } from "@prisma/client";
import { Payment, PaymentSummary } from "@/domain/entities/payment";
import { PaymentRepository } from "@/domain/repositories/payment-repository";
import { CorrelationId } from "@/domain/value-objects/correlation-id";
import { Money } from "@/domain/value-objects/money";
import { ProcessorType } from "@/domain/value-objects/processor-type";
import { PaymentStatus, ProcessorType as ProcessorTypeEnum } from "@/shared/enums/payment-enums";
import { LoggerService } from "@/shared/logging";

export class PrismaPaymentRepository implements PaymentRepository {
  private logger: LoggerService;

  constructor(private prisma: PrismaClient) {
    this.logger = new LoggerService("prisma-payment-repository");
  }

  async save(payment: Payment): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.prisma.payment.upsert({
        where: {
          correlationId: payment.correlationId.value,
        },
        update: {
          status: payment.status,
          processedAt: payment.processedAt,
          fee: payment.fee?.value,
          processor: payment.processor.value,
        },
        create: {
          correlationId: payment.correlationId.value,
          amount: payment.amount.value,
          requestedAt: payment.requestedAt,
          processor: payment.processor.value,
          status: payment.status,
          processedAt: payment.processedAt,
          fee: payment.fee?.value,
        },
      });
      
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("save", "payments", duration, true);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("save", "payments", duration, false, error as Error);
      throw error;
    }
  }

  async findByCorrelationId(correlationId: CorrelationId): Promise<Payment | null> {
    const startTime = Date.now();
    
    try {
      const paymentData = await this.prisma.payment.findUnique({
        where: {
          correlationId: correlationId.value,
        },
      });
      
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("find", "payments", duration, true);

      if (!paymentData) {
        return null;
      }

      return Payment.restore(
        CorrelationId.create(paymentData.correlationId),
        Money.create(Number(paymentData.amount)),
        paymentData.requestedAt,
        ProcessorType.create(paymentData.processor),
        paymentData.status as PaymentStatus,
        paymentData.processedAt || undefined,
        paymentData.fee ? Money.create(Number(paymentData.fee)) : undefined
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("find", "payments", duration, false, error as Error);
      throw error;
    }
  }

  async getSummary(from?: Date, to?: Date): Promise<PaymentSummary> {
    const startTime = Date.now();
    
    try {
      const whereClause = this.buildDateWhereClause(from, to);
      
      const [defaultStats, fallbackStats] = await Promise.all([
        this.getProcessorStats("default", whereClause),
        this.getProcessorStats("fallback", whereClause),
      ]);

      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("getSummary", "payments", duration, true);

      return {
        default: {
          totalRequests: defaultStats.count,
          totalAmount: defaultStats.sum,
        },
        fallback: {
          totalRequests: fallbackStats.count,
          totalAmount: fallbackStats.sum,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("getSummary", "payments", duration, false, error as Error);
      throw error;
    }
  }

  async countByProcessor(processor: ProcessorType, from?: Date, to?: Date): Promise<number> {
    const startTime = Date.now();
    
    try {
      const whereClause = {
        processor: processor.value,
        status: PaymentStatus.PROCESSED,
        ...this.buildDateWhereClause(from, to),
      };

      const count = await this.prisma.payment.count({
        where: whereClause,
      });

      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("count", "payments", duration, true);

      return count;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("count", "payments", duration, false, error as Error);
      throw error;
    }
  }

  async sumAmountByProcessor(processor: ProcessorType, from?: Date, to?: Date): Promise<number> {
    const startTime = Date.now();
    
    try {
      const whereClause = {
        processor: processor.value,
        status: PaymentStatus.PROCESSED,
        ...this.buildDateWhereClause(from, to),
      };

      const result = await this.prisma.payment.aggregate({
        where: whereClause,
        _sum: {
          amount: true,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("sum", "payments", duration, true);

      return Number(result._sum.amount || 0);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logDatabaseOperation("sum", "payments", duration, false, error as Error);
      throw error;
    }
  }

  private async getProcessorStats(
    processor: string,
    whereClause: any
  ): Promise<{ count: number; sum: number }> {
    const processorWhere = {
      processor,
      status: PaymentStatus.PROCESSED,
      ...whereClause,
    };

    const [countResult, sumResult] = await Promise.all([
      this.prisma.payment.count({
        where: processorWhere,
      }),
      this.prisma.payment.aggregate({
        where: processorWhere,
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      count: countResult,
      sum: Number(sumResult._sum.amount || 0),
    };
  }

  private buildDateWhereClause(from?: Date, to?: Date): any {
    const whereClause: any = {};

    if (from && to) {
      whereClause.requestedAt = {
        gte: from,
        lte: to,
      };
    } else if (from) {
      whereClause.requestedAt = {
        gte: from,
      };
    } else if (to) {
      whereClause.requestedAt = {
        lte: to,
      };
    }

    return whereClause;
  }
}