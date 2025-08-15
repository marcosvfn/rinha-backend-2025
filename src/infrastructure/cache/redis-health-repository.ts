import { RedisClientType } from "redis";
import { ProcessorHealthStatus } from "../../domain/entities/payment";
import { HealthRepository } from "../../domain/repositories/health-repository";
import { ProcessorType } from "../../domain/value-objects/processor-type";
import { APP_CONSTANTS } from "../../shared/constants/app-constants";
import { LoggerService } from "../../shared/logging";

export class RedisHealthRepository implements HealthRepository {
  private logger: LoggerService;

  constructor(private redis: RedisClientType) {
    this.logger = new LoggerService("redis-health-repository");
  }

  async getHealthStatus(
    processor: ProcessorType
  ): Promise<ProcessorHealthStatus | null> {
    const startTime = Date.now();
    const key = APP_CONSTANTS.CACHE_KEYS.HEALTH_STATUS(processor.value);

    try {
      const data = await this.redis.get(key);
      const duration = Date.now() - startTime;
      const hit = data !== null;

      this.logger.logCacheOperation("get", key, hit, duration);

      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      return {
        failing: parsed.failing,
        minResponseTime: parsed.minResponseTime,
        lastChecked: new Date(parsed.lastChecked),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        "Failed to get health status from cache",
        error as Error,
        {
          key,
          processor: processor.value,
          duration,
          operation: "cache_get_error",
        }
      );
      throw error;
    }
  }

  async setHealthStatus(
    processor: ProcessorType,
    status: ProcessorHealthStatus
  ): Promise<void> {
    const startTime = Date.now();
    const key = APP_CONSTANTS.CACHE_KEYS.HEALTH_STATUS(processor.value);

    try {
      const data = JSON.stringify(status);
      await this.redis.setEx(
        key,
        APP_CONSTANTS.REDIS.HEALTH_CACHE_TTL_SECONDS,
        data
      );

      const duration = Date.now() - startTime;
      this.logger.logCacheOperation("set", key, false, duration);

      this.logger.debug("Health status cached", {
        processor: processor.value,
        failing: status.failing,
        minResponseTime: status.minResponseTime,
        ttl: APP_CONSTANTS.REDIS.HEALTH_CACHE_TTL_SECONDS,
        operation: "health_status_cached",
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        "Failed to set health status in cache",
        error as Error,
        {
          key,
          processor: processor.value,
          duration,
          operation: "cache_set_error",
        }
      );
      throw error;
    }
  }

  async canCheckHealth(processor: ProcessorType): Promise<boolean> {
    const key = APP_CONSTANTS.CACHE_KEYS.HEALTH_CHECK_LIMIT(processor.value);
    const lastCheck = await this.redis.get(key);

    if (!lastCheck) {
      await this.redis.setEx(
        key,
        APP_CONSTANTS.REDIS.HEALTH_CHECK_RATE_LIMIT_SECONDS,
        Date.now().toString()
      );
      return true;
    }

    const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
    const rateLimitMs =
      APP_CONSTANTS.REDIS.HEALTH_CHECK_RATE_LIMIT_SECONDS * 1000;

    if (timeSinceLastCheck >= rateLimitMs) {
      await this.redis.setEx(
        key,
        APP_CONSTANTS.REDIS.HEALTH_CHECK_RATE_LIMIT_SECONDS,
        Date.now().toString()
      );
      return true;
    }

    return false;
  }
}
