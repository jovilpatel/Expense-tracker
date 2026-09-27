'use strict';

const { Router } = require('express');
const router = Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const personService = require('../services/personService');

// GET /api/persons
router.get(
  '/',
  asyncHandler((req, res) => {
    res.json({ data: personService.getPersons() });
  })
);

module.exports = router;