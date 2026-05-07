'use strict';

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// connect to the SQLite database
const db = new Database(path.join(__dirname, 'db', 'store.db'));

// create all tables if they don't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL CHECK (price > 0),
    stock INTEGER NOT NULL DEFAULT 0,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    UNIQUE (user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
  );
`);

// seed the products table on first run
const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO products (name, price, stock, brand, category, image_url) VALUES (?, ?, ?, ?, ?, ?)');
  insert.run('slim fit jeans',          59.99,  15, "Levi's",           'jeans',       'https://placehold.co/280x320/1e3a5f/ffffff?text=Slim+Fit+Jeans');
  insert.run('relaxed fit jeans',       49.99,  12, 'Wrangler',          'jeans',       'https://placehold.co/280x320/1e3a5f/ffffff?text=Relaxed+Fit+Jeans');
  insert.run('skinny jeans',            39.99,  10, 'H&M',               'jeans',       'https://placehold.co/280x320/1e3a5f/ffffff?text=Skinny+Jeans');
  insert.run('oxford button-down shirt',89.50,   8, 'Ralph Lauren',      'shirts',      'https://placehold.co/280x320/2d5a27/ffffff?text=Oxford+Shirt');
  insert.run('flannel plaid shirt',     75.00,  10, 'Pendleton',         'shirts',      'https://placehold.co/280x320/2d5a27/ffffff?text=Flannel+Shirt');
  insert.run('linen casual shirt',      39.90,  15, 'Uniqlo',            'shirts',      'https://placehold.co/280x320/2d5a27/ffffff?text=Linen+Shirt');
  insert.run('classic white tee',       15.99,  25, 'Hanes',             't-shirts',    'https://placehold.co/280x320/8a4a3a/ffffff?text=White+Tee');
  insert.run('graphic print tee',       22.00,  18, 'ASOS',              't-shirts',    'https://placehold.co/280x320/8a4a3a/ffffff?text=Graphic+Tee');
  insert.run('v-neck cotton tee',       29.99,  20, 'Calvin Klein',      't-shirts',    'https://placehold.co/280x320/8a4a3a/ffffff?text=V-Neck+Tee');
  insert.run('classic wool blazer',    249.00,   5, 'Hugo Boss',         'jackets',     'https://placehold.co/280x320/2d2750/ffffff?text=Wool+Blazer');
  insert.run('leather biker jacket',   399.00,   4, 'Schott NYC',        'jackets',     'https://placehold.co/280x320/2d2750/ffffff?text=Biker+Jacket');
  insert.run('windbreaker jacket',      89.95,  12, 'Nike',              'jackets',     'https://placehold.co/280x320/2d2750/ffffff?text=Windbreaker');
  insert.run('chino pants',             55.00,  14, 'Dockers',           'pants',       'https://placehold.co/280x320/1a4a3c/ffffff?text=Chino+Pants');
  insert.run('cargo pants',             65.00,  10, 'Carhartt',          'pants',       'https://placehold.co/280x320/1a4a3c/ffffff?text=Cargo+Pants');
  insert.run('crewneck sweater',        45.00,  16, 'Gap',               'sweaters',    'https://placehold.co/280x320/5a3a1a/ffffff?text=Crewneck');
  insert.run('cable knit sweater',      89.50,   8, 'J.Crew',            'sweaters',    'https://placehold.co/280x320/5a3a1a/ffffff?text=Cable+Knit');
  insert.run('leather belt',            75.00,  20, 'Coach',             'accessories', 'https://placehold.co/280x320/3a1a4a/ffffff?text=Leather+Belt');
  insert.run('wool scarf',             120.00,   9, 'Burberry',          'accessories', 'https://placehold.co/280x320/3a1a4a/ffffff?text=Wool+Scarf');
  insert.run('two-piece suit',         399.00,   6, 'Calvin Klein',      'suits',       'https://placehold.co/280x320/1a1a2e/ffffff?text=Two-Piece+Suit');
  insert.run('peacoat',                120.00,   7, 'H&M',               'coats',       'https://placehold.co/280x320/2e3a4a/ffffff?text=Peacoat');
  insert.run('chino shorts',            65.00,  11, 'Polo Ralph Lauren', 'shorts',      'https://placehold.co/280x320/1a5c2d/ffffff?text=Chino+Shorts');
}

// middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'mensstyle-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// make the logged-in user and cart count available in every view
app.use((req, res, next) => {
  if (req.session.userId) {
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.session.userId);
    res.locals.currentUser = user;
    const cartResult = db.prepare('SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ?').get(req.session.userId);
    res.locals.cartCount = cartResult.total || 0;
  } else {
    res.locals.currentUser = null;
    res.locals.cartCount = 0;
  }
  next();
});

// valid categories list
const VALID_CATEGORIES = ['jeans', 'shirts', 't-shirts', 'jackets', 'pants', 'shorts', 'sweaters', 'coats', 'suits', 'accessories'];

// helper: validate a product before saving it
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

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  const featured = db.prepare('SELECT * FROM products ORDER BY RANDOM() LIMIT 4').all();
  res.render('home', { title: "Men's Clothing Store", featured });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

// show all products, with optional category filter and search
app.get('/products', (req, res) => {
  const category = req.query.category;
  const search = req.query.q;
  let products;

  if (category && search) {
    const term = '%' + search.toLowerCase() + '%';
    products = db.prepare('SELECT * FROM products WHERE category = ? AND (LOWER(name) LIKE ? OR LOWER(brand) LIKE ?)').all(category, term, term);
  } else if (category) {
    products = db.prepare('SELECT * FROM products WHERE category = ?').all(category);
  } else if (search) {
    const term = '%' + search.toLowerCase() + '%';
    products = db.prepare('SELECT * FROM products WHERE LOWER(name) LIKE ? OR LOWER(brand) LIKE ?').all(term, term);
  } else {
    products = db.prepare('SELECT * FROM products').all();
  }

  res.render('products', {
    title: 'All Products',
    products,
    selectedCategory: category || '',
    searchQuery: search || '',
    VALID_CATEGORIES
  });
});

// show a single product by name
app.get('/products/:name', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE LOWER(name) = ?').get(req.params.name.trim().toLowerCase());
  if (!product) {
    return res.status(404).render('404', { title: 'Not Found' });
  }
  res.render('product-detail', { title: product.name, product });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — register, login, logout
// ─────────────────────────────────────────────────────────────────────────────

app.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.render('register', { title: 'Register', error: 'All fields are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.render('register', { title: 'Register', error: 'Username or email already taken.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hashed);
  req.session.userId = result.lastInsertRowid;
  res.redirect('/');
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { title: 'Login', error: 'Invalid username or password.' });
  }

  req.session.userId = user.id;
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/profile', (req, res) => {
  res.render('profile', { title: 'My Profile' });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────

app.get('/cart', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const items = db.prepare(`
    SELECT p.id AS product_id, p.name, p.price, ci.quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all(req.session.userId);

  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }

  res.render('cart', { title: 'Shopping Cart', items, total: total.toFixed(2) });
});

app.post('/cart/add', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const product_id = parseInt(req.body.product_id);
  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)
    ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + 1
  `).run(req.session.userId, product_id);

  res.redirect('/cart');
});

app.post('/cart/update', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const product_id = parseInt(req.body.product_id);
  const quantity = parseInt(req.body.quantity);

  if (quantity < 1) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.session.userId, product_id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(quantity, req.session.userId, product_id);
  }

  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const product_id = parseInt(req.body.product_id);
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.session.userId, product_id);

  res.redirect('/cart');
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT
// ─────────────────────────────────────────────────────────────────────────────

app.get('/checkout', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const items = db.prepare(`
    SELECT p.id AS product_id, p.name, p.price, ci.quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all(req.session.userId);

  if (items.length === 0) return res.redirect('/cart');

  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }

  res.render('checkout', { title: 'Checkout', items, total: total.toFixed(2) });
});

app.post('/checkout', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const items = db.prepare(`
    SELECT p.id AS product_id, p.name, p.price, ci.quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all(req.session.userId);

  if (items.length === 0) return res.redirect('/cart');

  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }

  // save the order
  const orderResult = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(req.session.userId, total);
  const orderId = orderResult.lastInsertRowid;

  // save each item in the order
  for (const item of items) {
    db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)')
      .run(orderId, item.product_id, item.name, item.price, item.quantity);
  }

  // clear the cart
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.session.userId);

  res.redirect('/orders/' + orderId);
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/orders', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.render('orders', { title: 'My Orders', orders });
});

app.get('/orders/:id', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!order) return res.redirect('/orders');

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.render('order-confirm', { title: 'Order #' + order.id, order, items });
});

// ─────────────────────────────────────────────────────────────────────────────
// REST API
// ─────────────────────────────────────────────────────────────────────────────

// return the total number of products in a header
app.head('/api/products', (req, res) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM products').get();
  res.set('X-Product-Count', String(result.count));
  res.status(200).end();
});

// get all products
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.status(200).json(products);
});

// add a new product
app.post('/api/products/add', (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const name = req.body.name.trim().toLowerCase();
  const existing = db.prepare('SELECT * FROM products WHERE LOWER(name) = ?').get(name);
  if (existing) {
    return res.status(409).json({ error: `Product "${name}" already exists.` });
  }

  const result = db.prepare('INSERT INTO products (name, price, stock, brand, category) VALUES (?, ?, ?, ?, ?)')
    .run(name, req.body.price, req.body.stock || 0, req.body.brand.trim(), req.body.category.trim().toLowerCase());

  const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newProduct);
});

// get one product by name
app.get('/api/products/:name', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE LOWER(name) = ?').get(req.params.name.trim().toLowerCase());
  if (!product) {
    return res.status(404).json({ error: `Product "${req.params.name}" not found.` });
  }
  res.status(200).json(product);
});

// delete a product by name
app.delete('/api/products/:name', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE LOWER(name) = ?').get(req.params.name.trim().toLowerCase());
  if (!product) {
    return res.status(404).json({ error: `Product "${req.params.name}" not found.` });
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
  res.status(204).end();
});

// ─────────────────────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
