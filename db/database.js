'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'store.db'));

// initialize all tables from schema.sql
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// seed products on first run
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  db.exec(fs.readFileSync(path.join(__dirname, 'seeds.sql'), 'utf8'));
}

function getCartItems(userId) {
  return db.prepare(`
    SELECT p.id AS product_id, p.name, p.price, ci.quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all(userId);
}

function calcTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

function findProductByName(name) {
  return db.prepare('SELECT * FROM products WHERE LOWER(name) = ?').get(name.trim().toLowerCase());
}

module.exports = { db, getCartItems, calcTotal, findProductByName };
