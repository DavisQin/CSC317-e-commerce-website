'use strict';

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ── Seed Data ───────────────────────────────────────────────────────────────
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

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function findByName(name) {
  const normalized = normalizeName(name);
  return products.find(p => normalizeName(p.name) === normalized) || null;
}

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

// ── View Routes (HTML pages) ──────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.render('home', { title: "Men's Clothing Store" });
});

app.get('/products', (req, res) => {
  res.render('products', { title: 'All Products', products });
});

app.get('/products/:identifier', (req, res) => {
  const product = findByName(req.params.identifier);
  if (!product) {
    return res.status(404).render('404', { title: 'Not Found', identifier: req.params.identifier });
  }
  res.render('product-detail', { title: product.name, product });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

app.post('/login', (req, res) => {
  res.redirect('/');
});

app.get('/profile', (req, res) => {
  res.render('profile', { title: 'My Profile' });
});

app.get('/cart', (req, res) => {
  res.render('cart', { title: 'Shopping Cart' });
});

// ── API Routes (JSON) ─────────────────────────────────────────────────────────

// HEAD /api/products — return total product count in a custom header
app.head('/api/products', (req, res) => {
  res.set('X-Product-Count', String(products.length));
  res.status(200).end();
});

// GET /api/products — return all products
app.get('/api/products', (req, res) => {
  res.status(200).json(products);
});

// POST /api/products/add — create a new product
app.post('/api/products/add', (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const normalizedName = normalizeName(req.body.name);

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

// GET /api/products/:identifier — retrieve a single product by name
app.get('/api/products/:identifier', (req, res) => {
  const product = findByName(req.params.identifier);
  if (!product) {
    return res.status(404).json({ error: `Product "${req.params.identifier}" not found.` });
  }
  res.status(200).json(product);
});

// DELETE /api/products/:identifier — remove a product by name
app.delete('/api/products/:identifier', (req, res) => {
  const index = products.findIndex(
    p => normalizeName(p.name) === normalizeName(req.params.identifier)
  );
  if (index === -1) {
    return res.status(404).json({ error: `Product "${req.params.identifier}" not found.` });
  }
  products.splice(index, 1);
  res.status(204).end();
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Men's Clothes API running at http://localhost:${PORT}`);
});
