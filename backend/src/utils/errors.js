/**
 * Custom application error class with status code
 */
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Create a 400 Bad Request error
 * @param {string} message - Error message
 * @returns {AppError}
 */
export const badRequest = (message = 'Bad Request') => new AppError(message, 400);

/**
 * Create a 401 Unauthorized error
 * @param {string} message - Error message
 * @returns {AppError}
 */
export const unauthorized = (message = 'Unauthorized') => new AppError(message, 401);

/**
 * Create a 403 Forbidden error
 * @param {string} message - Error message
 * @returns {AppError}
 */
export const forbidden = (message = 'Forbidden') => new AppError(message, 403);

/**
 * Create a 404 Not Found error
 * @param {string} message - Error message
 * @returns {AppError}
 */
export const notFound = (message = 'Not Found') => new AppError(message, 404);

/**
 * Create a 500 Internal Server error
 * @param {string} message - Error message
 * @returns {AppError}
 */
export const serverError = (message = 'Internal Server Error') => new AppError(message, 500);

/**
 * Handle async route errors - wraps async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with error handling
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Send error response to client
 * @param {object} res - Express response object
 * @param {Error} err - Error object
 * @param {boolean} includeStack - Include stack trace (dev only)
 */
export const sendErrorResponse = (res, err, includeStack = false) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Something went wrong';
    
    const response = { message };
    
    if (err.error) {
        response.error = err.error;
    }
    
    if (includeStack && err.stack) {
        response.stack = err.stack;
    }
    
    return res.status(statusCode).json(response);
};
