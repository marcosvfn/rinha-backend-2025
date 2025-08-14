import { DIContainer } from "@/shared/interfaces/container";
import { ProcessPaymentUseCase } from "@/application/use-cases/process-payment-use-case";
import { setupDependencies } from "@/infrastructure/config/app-config";

export class AppConfig {
  private static instance: AppConfig;
  private container: DIContainer | null = null;

  private constructor() {}

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  async initialize(): Promise<void> {
    if (!this.container) {
      this.container = await setupDependencies();
    }
  }

  getProcessPaymentUseCase(): ProcessPaymentUseCase {
    if (!this.container) {
      throw new Error("AppConfig not initialized. Call initialize() first.");
    }
    return this.container.resolve<ProcessPaymentUseCase>("ProcessPaymentUseCase");
  }

  getContainer(): DIContainer {
    if (!this.container) {
      throw new Error("AppConfig not initialized. Call initialize() first.");
    }
    return this.container;
  }
}