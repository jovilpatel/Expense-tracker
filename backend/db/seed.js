'use strict';

const { db } = require('./connection');

const CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Education',
  'Entertainment',
  'Salary',
  'Business',
  'Loan',
  'Borrowed',
  'Lent',
  'Other',
];

function seedCategories() {
  const insert = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  const seedAll = db.transaction((names) => {
    for (const name of names) insert.run(name);
  });
  seedAll(CATEGORIES);
  return db.prepare('SELECT id, name FROM categories ORDER BY id').all();
}

function seed() {
  return seedCategories();
}

if (require.main === module) {
  const rows = seed();
  console.log(`Seeded ${rows.length} categories:`);
  for (const row of rows) console.log(`  ${row.id}: ${row.name}`);
}

module.exports = { seed, seedCategories, CATEGORIES };