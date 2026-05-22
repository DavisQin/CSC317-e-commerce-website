'use strict';

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const { db, getCartItems, findProductByName } = require('./db/database');
const { validateProduct, calcTotal, VALID_CATEGORIES } = require('./helpers/methods');
const app = express();
const PORT = process.env.PORT || 3000;

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



// ─── HOME ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    const featured = db.prepare('SELECT * FROM products ORDER BY RANDOM() LIMIT 4').all();
    res.render('home', { title: "Men's Clothing Store", featured });
});

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

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

    res.render('products', { title: 'All Products', products, selectedCategory: category || '', searchQuery: search || '', VALID_CATEGORIES });
});

app.get('/products/:name', (req, res) => {
    const product = findProductByName(req.params.name);
    if (!product) return res.status(404).render('404', { title: 'Not Found' });
    res.render('product-detail', { title: product.name, product });
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

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

// ─── CART ────────────────────────────────────────────────────────────────────

app.get('/cart', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const items = getCartItems(req.session.userId);
    const total = calcTotal(items);
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

// ─── CHECKOUT ────────────────────────────────────────────────────────────────

app.get('/checkout', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const items = getCartItems(req.session.userId);
    if (items.length === 0) return res.redirect('/cart');

    const total = calcTotal(items);
    res.render('checkout', { title: 'Checkout', items, total: total.toFixed(2) });
});

app.post('/checkout', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const items = getCartItems(req.session.userId);
    if (items.length === 0) return res.redirect('/cart');

    const total = calcTotal(items);

    const orderResult = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(req.session.userId, total);
    const orderId = orderResult.lastInsertRowid;

    for (const item of items) {
        db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)')
            .run(orderId, item.product_id, item.name, item.price, item.quantity);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.session.userId);
    res.redirect('/orders/' + orderId);
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────

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

// ─── REST API ─────────────────────────────────────────────────────────────────

app.head('/api/products', (req, res) => {
    const result = db.prepare('SELECT COUNT(*) as count FROM products').get();
    res.set('X-Product-Count', String(result.count));
    res.status(200).end();
});

app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.status(200).json(products);
});

app.post('/api/products/add', (req, res) => {
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const name = req.body.name.trim().toLowerCase();
    const existing = findProductByName(name);
    if (existing) {
        return res.status(409).json({ error: `Product "${name}" already exists.` });
    }

    const result = db.prepare('INSERT INTO products (name, price, stock, brand, category) VALUES (?, ?, ?, ?, ?)')
        .run(name, req.body.price, req.body.stock || 0, req.body.brand.trim(), req.body.category.trim().toLowerCase());

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newProduct);
});

app.get('/api/products/:name', (req, res) => {
    const product = findProductByName(req.params.name);
    if (!product) {
        return res.status(404).json({ error: `Product "${req.params.name}" not found.` });
    }
    res.status(200).json(product);
});

app.delete('/api/products/:name', (req, res) => {
    const product = findProductByName(req.params.name);
    if (!product) {
        return res.status(404).json({ error: `Product "${req.params.name}" not found.` });
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
    res.status(204).end();
});

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).render('404', { title: 'Not Found' });
});

app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
});