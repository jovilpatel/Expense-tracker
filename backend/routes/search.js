'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { validateQuery } = require('../middleware/validate');
const { validateSearchQuery } = require('../validators/queryValidator');
const searchService = require('../services/searchService');

// GET /api/search?q=...  (q must be >= 2 chars, enforced by validator -> 422)
router.get(
  '/',
  validateQuery(validateSearchQuery),
  asyncHandler((req, res) => {
    res.json({ data: searchService.search(req.validatedQuery.q) });
  })
);

module.exports = router;