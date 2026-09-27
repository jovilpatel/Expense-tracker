'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { validateBody, validateQuery } = require('../middleware/validate');
const { parseId } = require('../validators/index');
const debtValidator = require('../validators/debtValidator');
const debtService = require('../services/debtService');
const { AppError } = require('../middleware/errorHandler');

const KIND = 'pay';

// GET /api/money-to-pay
router.get(
  '/',
  validateQuery(debtValidator.validateListQuery(KIND)),
  asyncHandler((req, res) => {
    res.json({ data: debtService.listDebts(KIND, req.validatedQuery) });
  })
);

// GET /api/money-to-pay/:id
router.get(
  '/:id',
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const debt = debtService.getDebt(KIND, id, { withPayments: true });
    if (!debt) throw new AppError(404, 'NOT_FOUND', 'Money to pay record not found');
    res.json({ data: debt });
  })
);

// POST /api/money-to-pay
router.post(
  '/',
  validateBody((body) => debtValidator.validateCreateDebt(body, KIND)),
  asyncHandler((req, res) => {
    const debt = debtService.createDebt(KIND, req.validatedBody);
    res.status(201).json({ data: debt });
  })
);

// PUT /api/money-to-pay/:id
router.put(
  '/:id',
  validateBody(debtValidator.validateUpdateDebt),
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const { data, unknown } = req.validatedBody;
    if (data && Object.keys(data).length === 0 && unknown.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Nothing to update', [{ field: 'body', issue: 'Provide at least one editable field' }]);
    }
    if (unknown.length) {
      throw new AppError(
        409,
        'READONLY_FIELD',
        'Financial fields cannot be edited through this endpoint; record a payment instead.',
        unknown.map((field) => ({ field, issue: 'This field is read-only' }))
      );
    }
    const debt = debtService.updateDebt(KIND, id, data);
    if (!debt) throw new AppError(404, 'NOT_FOUND', 'Money to pay record not found');
    res.json({ data: debt });
  })
);

// DELETE /api/money-to-pay/:id
router.delete(
  '/:id',
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const ok = debtService.deleteDebt(KIND, id);
    if (!ok) throw new AppError(404, 'NOT_FOUND', 'Money to pay record not found');
    res.json({ message: 'Deleted' });
  })
);

module.exports = router;