'use strict';

const { db } = require('../db/connection');

function list() {
  return db.prepare('SELECT id, name FROM categories ORDER BY id ASC').all();
}

function exists(name) {
  return Boolean(db.prepare('SELECT id FROM categories WHERE name = ?').get(name));
}

module.exports = { list, exists };