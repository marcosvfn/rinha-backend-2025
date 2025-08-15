import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PaymentJobData } from "./payment-queue";
import { ProcessPaymentUseCase, ProcessPaymentRequest } from "../../application/use-cases/process-payment-use-case";
import { CorrelationId } from "../../domain/value-objects/correlation-id";
import { Money } from "../../domain/value-objects/money";
import { LoggerService } from "../../shared/logging";
import { AppConfig } from "../config/app-config-singleton";

export class PaymentWorker {
  private worker: Worker<PaymentJobData>;
  private processPaymentUseCase: ProcessPaymentUseCase;
  private connection: IORedis;
  private logger: LoggerService;

  constructor(
    processPaymentUseCase: ProcessPaymentUseCase,
    redisHost: string = "redis",
    redisPort: number = 6379
  ) {
    this.processPaymentUseCase = processPaymentUseCase;
    this.logger = new LoggerService("payment-worker");
    
    this.connection = new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.worker = new Worker<PaymentJobData>(
      "payment-processing",
      this.processJob.bind(this),
      {
        connection: this.connection,
        concurrency: 10, // Processar 10 jobs simultaneamente
      }
    );

    this.setupEventListeners();
  }

  private async processJob(job: Job<PaymentJobData>): Promise<void> {
    const { correlationId, amount } = job.data;

    this.logger.info("Processing payment job", {
      correlationId,
      amount,
      jobId: job.id,
      operation: "worker_job_start",
    });

    try {
      const correlationIdVO = CorrelationId.create(correlationId);
      const amountVO = Money.create(amount);

      const request: ProcessPaymentRequest = {
        correlationId: correlationIdVO,
        amount: amountVO,
      };

      const result = await this.processPaymentUseCase.execute(request);

      if (result.isFailure) {
        throw result.getError();
      }

      this.logger.info("Payment job completed successfully", {
        correlationId,
        jobId: job.id,
        operation: "worker_job_success",
      });
    } catch (error) {
      this.logger.error("Payment job failed", error as Error, {
        correlationId,
        jobId: job.id,
        operation: "worker_job_failure",
      });
      throw error; // Re-lançar para acionar o mecanismo de retry do BullMQ
    }
  }

  private setupEventListeners(): void {
    this.worker.on("completed", (job) => {
      this.logger.info("Job completed", {
        jobId: job.id,
        correlationId: job.data.correlationId,
        operation: "worker_job_completed",
      });
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error("Job failed", err, {
        jobId: job?.id,
        correlationId: job?.data?.correlationId,
        operation: "worker_job_failed",
      });
    });

    this.worker.on("error", (err) => {
      this.logger.error("Worker error", err, {
        operation: "worker_error",
      });
    });
  }

  async start(): Promise<void> {
    this.logger.info("Starting payment worker", {
      operation: "worker_start",
    });
  }

  async stop(): Promise<void> {
    this.logger.info("Stopping payment worker", {
      operation: "worker_stop",
    });
    
    await this.worker.close();
    await this.connection.quit();
  }

  static async createWorker(): Promise<PaymentWorker> {
    const appConfig = AppConfig.getInstance();
    const processPaymentUseCase = appConfig.getProcessPaymentUseCase();
    
    return new PaymentWorker(
      processPaymentUseCase,
      process.env.REDIS_HOST || "redis",
      parseInt(process.env.REDIS_PORT || "6379")
    );
  }
}