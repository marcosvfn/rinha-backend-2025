import { ProcessorHealthStatus } from "../entities/payment";
import { ProcessorType } from "../value-objects/processor-type";

export interface HealthRepository {
  getHealthStatus(processor: ProcessorType): Promise<ProcessorHealthStatus | null>;
  setHealthStatus(processor: ProcessorType, status: ProcessorHealthStatus): Promise<void>;
  canCheckHealth(processor: ProcessorType): Promise<boolean>;
}