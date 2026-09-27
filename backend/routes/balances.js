'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const balanceService = require('../services/balanceService');

// GET /api/balances
router.get(
  '/',
  asyncHandler((req, res) => {
    res.json({ data: balanceService.getBalances() });
  })
);

module.exports = router;