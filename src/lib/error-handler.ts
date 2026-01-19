import logger, { logError } from './logger';

/**
 * Custom Application Error class
 * Used to create operational errors with specific status codes
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Handle and log application errors
 */
export function handleError(
  error: Error | AppError | unknown,
  context?: Record<string, any>
): void {
  if (error instanceof AppError) {
    // Operational error - log with context
    logger.error('Application error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      },
      ...error.context,
      ...context,
    });
  } else if (error instanceof Error) {
    // Regular error
    logError(error, {
      type: 'UnhandledError',
      ...context,
    });
  } else {
    // Unknown error type
    logger.error('Unknown error type', {
      error: String(error),
      ...context,
    });
  }
}

/**
 * API Route error handler for Next.js
 * Returns appropriate JSON response based on error type
 */
export function apiErrorHandler(
  error: Error | AppError | unknown,
  req?: Request | any,
  additionalContext?: Record<string, any>
): Response {
  // Build context from request if available
  const context: Record<string, any> = {
    ...additionalContext,
  };

  if (req) {
    context.request = {
      method: req.method,
      url: req.url,
      headers: req.headers instanceof Headers 
        ? Object.fromEntries(req.headers.entries())
        : req.headers,
    };
  }

  // Log the error
  handleError(error, context);

  // Determine response
  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        statusCode: error.statusCode,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: error.statusCode }
    );
  }

  // Default error response for unknown errors
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error instanceof Error
      ? error.message
      : 'Unknown error occurred';

  return Response.json(
    {
      error: message,
      statusCode: 500,
      ...(process.env.NODE_ENV === 'development' && 
        error instanceof Error && { stack: error.stack }
      ),
    },
    { status: 500 }
  );
}

/**
 * Create common application errors
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found', context?: Record<string, any>) {
    super(message, 404, true, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', context?: Record<string, any>) {
    super(message, 409, true, context);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', context?: Record<string, any>) {
    super(message, 422, true, context);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}

/**
 * Async error wrapper for API routes
 * Catches errors and passes them to the error handler
 */
export function asyncHandler(
  handler: (req: Request, context?: any) => Promise<Response>
) {
  return async (req: Request, context?: any): Promise<Response> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return apiErrorHandler(error, req);
    }
  };
}

/**
 * Database error handler
 * Converts database errors to AppErrors with appropriate messages
 */
export function handleDatabaseError(error: any, operation: string): never {
  logger.error('Database error', {
    operation,
    error: {
      code: error.code,
      message: error.message,
      detail: error.detail,
    },
  });

  // Handle specific database errors
  if (error.code === '23505') {
    throw new ConflictError('Resource already exists', { operation });
  }

  if (error.code === '23503') {
    throw new BadRequestError('Referenced resource not found', { operation });
  }

  if (error.code === '23502') {
    throw new BadRequestError('Required field missing', { operation });
  }

  // Generic database error
  throw new InternalServerError('Database operation failed', { operation });
}
