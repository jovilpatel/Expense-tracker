'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { validateBody } = require('../middleware/validate');
const paymentValidator = require('../validators/paymentValidator');
const paymentService = require('../services/paymentService');

// POST /api/payments/receive
router.post(
  '/receive',
  validateBody(paymentValidator.validatePayment),
  asyncHandler((req, res) => {
    const result = paymentService.receivePayment(req.validatedBody);
    res.status(201).json({ data: result });
  })
);

// POST /api/payments/pay
router.post(
  '/pay',
  validateBody(paymentValidator.validatePayment),
  asyncHandler((req, res) => {
    const result = paymentService.payPayment(req.validatedBody);
    res.status(201).json({ data: result });
  })
);

module.exports = router;