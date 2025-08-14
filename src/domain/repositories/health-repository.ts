import { ProcessorHealthStatus } from "@/domain/entities/payment";
import { ProcessorType } from "@/domain/value-objects/processor-type";

export interface HealthRepository {
  getHealthStatus(processor: ProcessorType): Promise<ProcessorHealthStatus | null>;
  setHealthStatus(processor: ProcessorType, status: ProcessorHealthStatus): Promise<void>;
  canCheckHealth(processor: ProcessorType): Promise<boolean>;
}