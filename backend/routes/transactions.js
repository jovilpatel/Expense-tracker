'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { validateBody, validateQuery } = require('../middleware/validate');
const { parseId } = require('../validators/index');
const validator = require('../validators/transactionValidator');
const transactionService = require('../services/transactionService');
const { AppError } = require('../middleware/errorHandler');

// GET /api/transactions
router.get(
  '/',
  validateQuery(validator.validateListQuery),
  asyncHandler((req, res) => {
    const { page, limit, sort, ...filters } = req.validatedQuery;
    const result = transactionService.list({ filters, page, limit, sort });
    res.json(result);
  })
);

// GET /api/transactions/:id
router.get(
  '/:id',
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const tx = transactionService.getById(id);
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    res.json({ data: tx });
  })
);

// POST /api/transactions
router.post(
  '/',
  validateBody(validator.validateCreate),
  asyncHandler((req, res) => {
    const data = req.validatedBody;
    if (data.category) transactionService.assertCategoryExists(data.category);
    const tx = transactionService.create(data);
    res.status(201).json({ data: tx });
  })
);

// PUT /api/transactions/:id
router.put(
  '/:id',
  validateBody(validator.validateUpdate),
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const patch = req.validatedBody;
    if (patch.category) transactionService.assertCategoryExists(patch.category);
    const tx = transactionService.update(id, patch);
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    res.json({ data: tx });
  })
);

// DELETE /api/transactions/:id
router.delete(
  '/:id',
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const ok = transactionService.remove(id);
    if (!ok) throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    res.json({ message: 'Deleted' });
  })
);

module.exports = router;