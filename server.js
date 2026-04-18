'use strict';

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Seed Data ───────────────────────────────────────────────────────────────
// Each product has: id, name (identifier), category, brand, price, sizes, color, inStock
let products = [
  {
    id: 1,
    name: 'slim fit jeans',
    category: 'jeans',
    brand: "Levi's",
    price: 59.99,
    sizes: ['28', '30', '32', '34', '36'],
    color: 'indigo blue',
    inStock: true
  },
  {
    id: 2,
    name: 'oxford button-down shirt',
    category: 'shirts',
    brand: 'Ralph Lauren',
    price: 89.50,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    color: 'white',
    inStock: true
  },
  {
    id: 3,
    name: 'classic wool blazer',
    category: 'jackets',
    brand: 'Hugo Boss',
    price: 249.00,
    sizes: ['38R', '40R', '42R', '44R'],
    color: 'charcoal gray',
    inStock: true
  },
  {
    id: 4,
    name: 'chino pants',
    category: 'pants',
    brand: 'Dockers',
    price: 45.00,
    sizes: ['30x30', '32x30', '32x32', '34x32', '36x32'],
    color: 'khaki',
    inStock: false
  },
  {
    id: 5,
    name: 'graphic crew neck tee',
    category: 't-shirts',
    brand: 'Uniqlo',
    price: 19.99,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    color: 'black',
    inStock: true
  }
];

let nextId = products.length + 1;

// ── Helper Functions ─────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'jeans', 'shirts', 't-shirts', 'jackets',
  'pants', 'shorts', 'sweaters', 'coats', 'suits', 'accessories'
];

// Normalize a product name: trim whitespace, lowercase
function normalizeName(name) {
  return name.trim().toLowerCase();
}

// Find a product by name (case-insensitive)
function findByName(name) {
  const normalized = normalizeName(name);
  return products.find(p => normalizeName(p.name) === normalized) || null;
}

// Validate the request body for a new product; returns array of error strings
function validateProduct(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required and must be a non-empty string');
  }

  if (!body.category || typeof body.category !== 'string') {
    errors.push('category is required and must be a string');
  } else if (!VALID_CATEGORIES.includes(body.category.trim().toLowerCase())) {
    errors.push('category must be one of: ' + VALID_CATEGORIES.join(', '));
  }

  if (!body.brand || typeof body.brand !== 'string' || !body.brand.trim()) {
    errors.push('brand is required and must be a non-empty string');
  }

  if (body.price === undefined || body.price === null) {
    errors.push('price is required');
  } else if (typeof body.price !== 'number' || isNaN(body.price) || body.price <= 0) {
    errors.push('price must be a positive number');
  }

  if (!body.sizes || !Array.isArray(body.sizes) || body.sizes.length === 0) {
    errors.push('sizes is required and must be a non-empty array of strings');
  }

  if (!body.color || typeof body.color !== 'string' || !body.color.trim()) {
    errors.push('color is required and must be a non-empty string');
  }

  return errors;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// HEAD / — return total product count in a custom header (no body)
// Must be defined before GET / so Express doesn't absorb HEAD into the GET handler
app.head('/', (req, res) => {
  res.set('X-Product-Count', String(products.length));
  res.status(200).end();
});

// GET / — return all products
app.get('/', (req, res) => {
  res.status(200).json(products);
});

// POST /add — create a new product
app.post('/add', (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const normalizedName = normalizeName(req.body.name);

  // 409 Conflict if a product with the same name already exists
  if (findByName(normalizedName)) {
    return res.status(409).json({ error: `Product "${normalizedName}" already exists.` });
  }

  const newProduct = {
    id: nextId++,
    name: normalizedName,
    category: req.body.category.trim().toLowerCase(),
    brand: req.body.brand.trim(),
    price: req.body.price,
    sizes: req.body.sizes,
    color: req.body.color.trim().toLowerCase(),
    inStock: req.body.inStock !== undefined ? Boolean(req.body.inStock) : true
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// GET /:name — retrieve a single product by name (case-insensitive)
app.get('/:name', (req, res) => {
  const product = findByName(req.params.name);
  if (!product) {
    return res.status(404).json({ error: `Product "${req.params.name}" not found.` });
  }
  res.status(200).json(product);
});

// DELETE /:name — remove a product by name (case-insensitive)
app.delete('/:name', (req, res) => {
  const index = products.findIndex(
    p => normalizeName(p.name) === normalizeName(req.params.name)
  );
  if (index === -1) {
    return res.status(404).json({ error: `Product "${req.params.name}" not found.` });
  }
  products.splice(index, 1);
  res.status(204).end();
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Men's Clothes API running at http://localhost:${PORT}`);
});
