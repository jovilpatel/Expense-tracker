'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const alertsService = require('../services/alertsService');

// GET /api/alerts
// NOTE: the raw alerts object is returned (not wrapped in { data }) because the
// frontend Dashboard reads `alerts.receive` / `alerts.pay` directly.
router.get(
  '/',
  asyncHandler((req, res) => {
    res.json(alertsService.getAlerts());
  })
);

module.exports = router;