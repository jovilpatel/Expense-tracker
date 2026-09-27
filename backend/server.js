'use strict';

require('./config/env');
const config = require('./config/env');

const { seed } = require('./db/seed');
const { db, DB_PATH } = require('./db/connection');
const app = require('./app');

const CATEGORIES = seed(); // idempotent -- safe to run every boot

const server = app.listen(config.port, config.host, () => {
  console.log(`[server] Expense Tracker backend listening on http://${config.host}:${config.port}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
  console.log(`[server] Database: ${DB_PATH}`);
  console.log(`[server] CORS origin: ${config.corsOrigin}`);
  console.log(`[server] Categories seeded: ${CATEGORIES.length}`);
});

function shutdown(signal) {
  console.log(`\n[server] ${signal} received, shutting down...`);
  server.close(() => {
    try {
      db.close();
    } catch (err) {
      // already closed
    }
    process.exit(0);
  });
  // Force-exit if connections hang.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${config.port} is already in use.`);
    process.exit(1);
  }
  console.error('[server]', err);
});