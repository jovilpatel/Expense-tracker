'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const ENV_FILE = path.join(__dirname, '..', '.env');

if (fs.existsSync(ENV_FILE)) {
  dotenv.config({ path: ENV_FILE });
} else if (process.env.NODE_ENV !== 'test') {
  // Defaults below keep the local-first MVP runnable without a .env file.
  console.warn('[env] No .env file found; using built-in defaults (see .env.example).');
}

function fail(message) {
  throw new Error(`[env] ${message}`);
}

const rawPort = process.env.PORT !== undefined ? process.env.PORT : '4000';
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  fail(`PORT must be an integer between 1 and 65535, got "${rawPort}"`);
}

const host = process.env.HOST || '127.0.0.1';
if (typeof host !== 'string' || host.trim() === '') {
  fail('HOST must be a non-empty string');
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  fail(`NODE_ENV must be one of development|test|production, got "${nodeEnv}"`);
}

const dbPath = process.env.DB_PATH || './data/expense.db';
if (typeof dbPath !== 'string' || dbPath.trim() === '') {
  fail('DB_PATH must be a non-empty string');
}

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
if (typeof corsOrigin !== 'string' || corsOrigin.trim() === '') {
  fail('CORS_ORIGIN must be a non-empty string');
}

const config = {
  port,
  host,
  nodeEnv,
  dbPath,
  corsOrigin,
};

// connection.js reads process.env.DB_PATH at require time -- set it here so the
// resolved value always agrees with this module.
process.env.DB_PATH = config.dbPath;

module.exports = config;