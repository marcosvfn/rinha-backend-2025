import winston from "winston";
import { APP_CONSTANTS } from "../constants/app-constants";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    };

    if (isDevelopment) {
      return JSON.stringify(logEntry, null, 2);
    }

    return JSON.stringify(logEntry);
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

export const createLogger = (service: string = "app"): winston.Logger => {
  const transports: winston.transport[] = [];

  if (!isProduction || isDevelopment) {
    transports.push(
      new winston.transports.Console({
        level: isDevelopment ? "debug" : APP_CONSTANTS.LOGGING.LOG_LEVEL,
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true,
      })
    );
  }

  if (isProduction) {
    transports.push(
      new winston.transports.File({
        filename: `${APP_CONSTANTS.LOGGING.LOG_DIR}/${service}-error.log`,
        level: "error",
        format: logFormat,
        maxsize: parseInt(APP_CONSTANTS.LOGGING.MAX_FILE_SIZE) * 1024 * 1024,
        maxFiles: APP_CONSTANTS.LOGGING.MAX_FILES,
        handleExceptions: true,
        handleRejections: true,
      }),
      new winston.transports.File({
        filename: `${APP_CONSTANTS.LOGGING.LOG_DIR}/${service}-combined.log`,
        level: APP_CONSTANTS.LOGGING.LOG_LEVEL,
        format: logFormat,
        maxsize: parseInt(APP_CONSTANTS.LOGGING.MAX_FILE_SIZE) * 1024 * 1024,
        maxFiles: APP_CONSTANTS.LOGGING.MAX_FILES,
      })
    );
  }

  return winston.createLogger({
    level: APP_CONSTANTS.LOGGING.LOG_LEVEL,
    format: logFormat,
    defaultMeta: {
      service,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || "1.0.0",
    },
    transports,
    exitOnError: false,
  });
};
