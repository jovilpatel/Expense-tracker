'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const categoryService = require('../services/categoryService');

// GET /api/categories
router.get(
  '/',
  asyncHandler((req, res) => {
    res.json({ data: categoryService.list() });
  })
);

module.exports = router;