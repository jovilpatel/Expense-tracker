'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { validateQuery } = require('../middleware/validate');
const { validateExportQuery, validateReportQuery } = require('../validators/queryValidator');
const exportService = require('../services/exportService');

// GET /api/export/transactions.csv
router.get(
  '/transactions.csv',
  validateQuery(validateExportQuery),
  asyncHandler((req, res) => {
    exportService.sendCsv(res, 'transactions.csv', exportService.transactionsCsv(req.validatedQuery));
  })
);

// GET /api/export/debts-receive.csv
router.get(
  '/debts-receive.csv',
  asyncHandler((req, res) => {
    exportService.sendCsv(res, 'debts-receive.csv', exportService.debtsCsv('receive'));
  })
);

// GET /api/export/debts-pay.csv
router.get(
  '/debts-pay.csv',
  asyncHandler((req, res) => {
    exportService.sendCsv(res, 'debts-pay.csv', exportService.debtsCsv('pay'));
  })
);

// GET /api/export/payments.csv
router.get(
  '/payments.csv',
  asyncHandler((req, res) => {
    exportService.sendCsv(res, 'payments.csv', exportService.paymentsCsv());
  })
);

// GET /api/export/reports.csv
router.get(
  '/reports.csv',
  validateQuery(validateReportQuery),
  asyncHandler((req, res) => {
    exportService.sendCsv(res, 'reports.csv', exportService.reportsCsv(req.validatedQuery));
  })
);

module.exports = router;