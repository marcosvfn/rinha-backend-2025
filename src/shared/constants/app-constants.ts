export const APP_CONSTANTS = {
  DATABASE: {
    MIN_POOL_SIZE: 5,
    MAX_POOL_SIZE: 20,
    IDLE_TIMEOUT_MS: 30000,
    CONNECTION_TIMEOUT_MS: 2000,
  },
  REDIS: {
    CONNECT_TIMEOUT_MS: 2000,
    COMMAND_TIMEOUT_MS: 1000,
    HEALTH_CACHE_TTL_SECONDS: 300,
    HEALTH_CHECK_RATE_LIMIT_SECONDS: 5,
  },
  HTTP: {
    REQUEST_TIMEOUT_MS: 1000,
    DEFAULT_PROCESSOR_FEE: 0.05,
    FALLBACK_PROCESSOR_FEE: 0.15,
  },
  VALIDATION: {
    UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 999999.99,
  },
  CACHE_KEYS: {
    HEALTH_STATUS: (processor: string) => `health:${processor}`,
    HEALTH_CHECK_LIMIT: (processor: string) => `health_check_limit:${processor}`,
  },
  LOGGING: {
    MAX_FILE_SIZE: "20m",
    MAX_FILES: 5,
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    LOG_FORMAT: process.env.LOG_FORMAT || "json",
    LOG_DIR: process.env.LOG_DIR || "logs",
  },
} as const;