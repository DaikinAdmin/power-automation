import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Only import DailyRotateFile if not during build
let DailyRotateFile: any;
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  try {
    DailyRotateFile = require('winston-daily-rotate-file');
  } catch (e) {
    // Module not available during build
  }
}

// Determine log directory based on environment
const getLogDir = () => {
  // During build, use a temp directory that won't cause errors
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return '/tmp/logs';
  }
  if (process.env.NODE_ENV === 'production') {
    return process.env.LOG_DIR || '/app/logs';
  }
  return process.env.LOG_DIR || 'logs';
};

const logDir = getLogDir();

// Ensure log directory exists (but not during build)
const canCreateLogDir = typeof window === 'undefined' && 
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.NODE_ENV !== undefined;

if (canCreateLogDir) {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    // Silently fail during build or if cannot create directory
    // This is expected during Next.js build phase
  }
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let msg = `${timestamp} [${level}]`;
    if (service) msg += ` [${service}]`;
    msg += `: ${message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport for all environments
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  })
);

// File transports for production or when LOG_TO_FILE is enabled (but not during build)
const shouldEnableFileLogging = canCreateLogDir && 
  DailyRotateFile &&
  fs.existsSync(logDir) &&
  (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true');

if (shouldEnableFileLogging) {
  try {
    // Error logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d', // Keep for 14 days
        zippedArchive: true,
      })
    );

    // Combined logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      })
    );

    // HTTP access logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'access-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '7d', // Keep for 7 days
        zippedArchive: true,
      })
    );
  } catch (error) {
    // Fail silently if file logging cannot be set up
    // This can happen during build or if filesystem is read-only
  }
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'power-automation',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || 'localhost',
  },
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 10485760, // 10MB
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 10485760, // 10MB
    }),
  ],
});

// Helper function to log HTTP requests
export function logHttpRequest(req: {
  method?: string;
  url?: string;
  headers?: any;
}, res: {
  statusCode?: number;
}, duration?: number) {
  const logData: any = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    ip: req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown',
    userAgent: req.headers?.['user-agent'],
  };

  if (duration !== undefined) {
    logData.duration = `${duration}ms`;
  }

  logger.http('HTTP Request', logData);
}

// Helper function to log errors with context
export function logError(
  error: Error | unknown,
  context?: Record<string, any>
) {
  if (error instanceof Error) {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  } else {
    logger.error('Unknown error', {
      error: String(error),
      ...context,
    });
  }
}

// Helper function to create child logger with additional metadata
export function createLogger(metadata: Record<string, any>) {
  return logger.child(metadata);
}

// Export the logger instance
export default logger;
