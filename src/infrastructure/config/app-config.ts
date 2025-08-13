import { GetPaymentSummaryUseCase } from "../../application/use-cases/get-payment-summary-use-case";
import { ProcessPaymentUseCase } from "../../application/use-cases/process-payment-use-case";
import { ProcessorConfig } from "../../domain/entities/payment";
import { HealthRepository } from "../../domain/repositories/health-repository";
import { PaymentRepository } from "../../domain/repositories/payment-repository";
import { PaymentProcessorService } from "../../domain/services/payment-processor-service";
import { PaymentController } from "../../presentation/controllers/payment-controller";
import { DIContainer } from "../../shared/interfaces/container";
import { RedisHealthRepository } from "../cache/redis-health-repository";
import { PrismaPaymentRepository } from "../database/prisma-payment-repository";
import { HttpPaymentProcessorService } from "../http/payment-processor-service";
import { createPrismaClient } from "./prisma";
import { createRedisClient } from "./redis";

export const setupDependencies = async (): Promise<DIContainer> => {
  const container = new DIContainer();

  const prisma = createPrismaClient();
  const redisClient = createRedisClient();
  await redisClient.connect();
  
  // Teste de conexão do Prisma
  await prisma.$connect();

  const processorConfigs = new Map<string, ProcessorConfig>([
    [
      "default",
      {
        name: "default",
        url:
          process.env.DEFAULT_PROCESSOR_URL ||
          "http://payment-processor-default:8080",
        fee: 0.05,
      },
    ],
    [
      "fallback",
      {
        name: "fallback",
        url:
          process.env.FALLBACK_PROCESSOR_URL ||
          "http://payment-processor-fallback:8080",
        fee: 0.15,
      },
    ],
  ]);

  container.registerSingleton<PaymentRepository>(
    "PaymentRepository",
    () => new PrismaPaymentRepository(prisma)
  );

  container.registerSingleton<HealthRepository>(
    "HealthRepository",
    () => new RedisHealthRepository(redisClient as any)
  );

  container.registerSingleton<PaymentProcessorService>(
    "PaymentProcessorService",
    () => new HttpPaymentProcessorService()
  );

  container.registerSingleton<ProcessPaymentUseCase>(
    "ProcessPaymentUseCase",
    () =>
      new ProcessPaymentUseCase(
        container.resolve<PaymentRepository>("PaymentRepository"),
        container.resolve<HealthRepository>("HealthRepository"),
        container.resolve<PaymentProcessorService>("PaymentProcessorService"),
        processorConfigs
      )
  );

  container.registerSingleton<GetPaymentSummaryUseCase>(
    "GetPaymentSummaryUseCase",
    () =>
      new GetPaymentSummaryUseCase(
        container.resolve<PaymentRepository>("PaymentRepository")
      )
  );

  container.registerSingleton<PaymentController>(
    "PaymentController",
    () =>
      new PaymentController(
        container.resolve<ProcessPaymentUseCase>("ProcessPaymentUseCase"),
        container.resolve<GetPaymentSummaryUseCase>("GetPaymentSummaryUseCase")
      )
  );

  return container;
};
