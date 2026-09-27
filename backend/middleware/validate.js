'use strict';

/**
 * Validation middleware factory. The given validator throws an AppError on
 * failure; on success its return value is attached to `req.validatedX`.
 */
function makeValidate(part, key) {
  return (validator) => (req, res, next) => {
    try {
      req[key] = validator(req[part]);
      next();
    } catch (err) {
      next(err);
    }
  };
}

const validateBody = makeValidate('body', 'validatedBody');
const validateQuery = makeValidate('query', 'validatedQuery');
const validateParams = makeValidate('params', 'validatedParams');

module.exports = { validateBody, validateQuery, validateParams };