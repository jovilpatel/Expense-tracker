'use strict';

const { Router } = require('express');
const router = Router();

router.use('/transactions', require('./transactions'));
router.use('/money-to-receive', require('./moneyToReceive'));
router.use('/money-to-pay', require('./moneyToPay'));
router.use('/payments', require('./payments'));
router.use('/balances', require('./balances'));
router.use('/reports', require('./reports'));
router.use('/persons', require('./persons'));
router.use('/search', require('./search'));
router.use('/categories', require('./categories'));
router.use('/alerts', require('./alerts'));
router.use('/export', require('./export'));

module.exports = router;