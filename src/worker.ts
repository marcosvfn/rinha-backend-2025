import { AppConfig } from "./infrastructure/config/app-config-singleton";
import { PaymentWorker } from "./infrastructure/queue/payment-worker";
import { LoggerService } from "./shared/logging";

const logger = new LoggerService("worker");

async function startWorker(): Promise<void> {
  try {
    logger.info("Initializing payment worker...", {
      operation: "worker_initialization",
    });

    const appConfig = AppConfig.getInstance();
    await appConfig.initialize();

    const worker = await PaymentWorker.createWorker();
    await worker.start();

    logger.info("Payment worker started successfully", {
      operation: "worker_started",
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down worker gracefully...`, {
        signal,
        operation: "worker_shutdown_start",
      });

      try {
        await worker.stop();
        logger.info("Worker stopped successfully", {
          operation: "worker_shutdown_complete",
        });
        process.exit(0);
      } catch (error) {
        logger.error("Error during worker shutdown", error as Error, {
          operation: "worker_shutdown_error",
        });
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception in worker process", error, {
        operation: "worker_uncaught_exception",
      });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection in worker process", reason as Error, {
        promise: promise.toString(),
        operation: "worker_unhandled_rejection",
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start payment worker", error as Error, {
      operation: "worker_start_failure",
    });
    process.exit(1);
  }
}

startWorker().catch((error) => {
  console.error("Fatal error starting worker:", error);
  process.exit(1);
});
