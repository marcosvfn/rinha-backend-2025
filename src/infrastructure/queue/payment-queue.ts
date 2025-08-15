import { Queue } from "bullmq";
import IORedis from "ioredis";
import { CorrelationId } from "../../domain/value-objects/correlation-id";
import { Money } from "../../domain/value-objects/money";

export interface PaymentJobData {
  correlationId: string;
  amount: number;
}

export class PaymentQueue {
  private queue: Queue<PaymentJobData>;
  private connection: IORedis;

  constructor(redisHost: string = "redis", redisPort: number = 6379) {
    this.connection = new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.queue = new Queue<PaymentJobData>("payment-processing", {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 100, // Manter os últimos 100 jobs concluídos
        removeOnFail: 50,      // Manter os últimos 50 jobs falhados
        attempts: 3,           // Tentar até 3 vezes
        backoff: {
          type: "exponential",
          delay: 1000,         // Começar com delay de 1s
        },
      },
    });
  }

  async addPaymentJob(correlationId: CorrelationId, amount: Money): Promise<void> {
    const jobData: PaymentJobData = {
      correlationId: correlationId.value,
      amount: amount.value,
    };

    await this.queue.add("process-payment", jobData, {
      jobId: correlationId.value, // Usar correlation ID como job ID para prevenir duplicatas
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }

  getQueue(): Queue<PaymentJobData> {
    return this.queue;
  }

  getConnection(): IORedis {
    return this.connection;
  }
}