'use strict';

/**
 * Structured application error. Serialised by the errorHandler middleware into
 * the standard contract shape: { error: { code, message, details } }.
 */
class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function sendError(res, err) {
  // Malformed JSON body (express.json) surfaces as a SyntaxError with status 400.
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body is not valid JSON',
        details: [{ field: 'body', issue: 'Malformed JSON' }],
      },
    });
  }

  // SQLite constraint violations (CHECK, unique, FK) -> friendly 400.
  if (err && typeof err.code === 'string' && err.code.startsWith('SQLITE_')) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request violates a database constraint',
        details: [{ field: '', issue: err.message }],
      },
    });
  }

  const status = Number.isInteger(err && err.status) ? err.status : 500;
  const code = err && err.code ? err.code : 'INTERNAL_ERROR';
  const isServerError = status >= 500;

  if (isServerError) {
    // Never leak internal details to the client.
    console.error('[error]', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: [],
      },
    });
  }

  res.status(status).json({
    error: {
      code,
      message: err.message || 'Request failed',
      details: Array.isArray(err.details) ? err.details : [],
    },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  sendError(res, err);
}

function notFoundHandler(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

module.exports = { AppError, errorHandler, notFoundHandler, sendError };