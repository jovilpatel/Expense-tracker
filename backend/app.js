'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler, AppError } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json({ limit: '100kb' }));

// Health check (kept outside /api so ops can probe without CORS noise).
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', routes);

// Unknown API route -> 404 in the standard error shape.
app.use('/api', (req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found')));

app.use(errorHandler);

module.exports = app;