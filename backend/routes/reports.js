'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { validateQuery } = require('../middleware/validate');
const { validateReportQuery } = require('../validators/queryValidator');
const reportService = require('../services/reportService');

// GET /api/reports
router.get(
  '/',
  validateQuery(validateReportQuery),
  asyncHandler((req, res) => {
    const report = reportService.getReport(req.validatedQuery);
    res.json({ data: report });
  })
);

module.exports = router;