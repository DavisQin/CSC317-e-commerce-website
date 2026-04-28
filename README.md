# Men's Clothing Store — CSC 317 Group Assignment

## Group Members
| Name | GitHub Username |
|------|----------------|
| Lior Elbert | holyfield22 |
| Davis Qin | DavisQin |


---

## Project Description
A men's clothing e-commerce web application built with Node.js + Express. It serves HTML pages rendered with **Pug** templates and exposes a JSON REST API for programmatic access. The store sells jeans, shirts, jackets, pants, t-shirts, and more.

---

## Data Model

Each product object has the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Auto-incremented unique identifier |
| `name` | `string` | Product name — used as the URL identifier (normalized to lowercase) |
| `category` | `string` | One of: `jeans`, `shirts`, `t-shirts`, `jackets`, `pants`, `shorts`, `sweaters`, `coats`, `suits`, `accessories` |
| `brand` | `string` | Brand name (e.g. "Levi's", "Uniqlo") |
| `price` | `number` | Price in USD — must be greater than 0 |
| `sizes` | `string[]` | Available sizes (e.g. `["S","M","L"]` or `["30","32","34"]`) |
| `color` | `string` | Color description (normalized to lowercase) |
| `inStock` | `boolean` | Whether the item is currently available (defaults to `true`) |

### Example Object
```json
{
  "id": 1,
  "name": "slim fit jeans",
  "category": "jeans",
  "brand": "Levi's",
  "price": 59.99,
  "sizes": ["28", "30", "32", "34", "36"],
  "color": "indigo blue",
  "inStock": true
}
```

---

## Installation & Setup

```bash
# 1. Clone the repo and switch to the correct branch
git clone https://github.com/DavisQin/CSC317-e-commerce-website.git
cd CSC317-e-commerce-website
git checkout pug-templates-HW

# 2. Install dependencies
npm install

# 3a. Start (production)
npm start

# 3b. Start with auto-reload (development)
npm run dev
```

The server runs on **http://localhost:3000** by default.  
Set a `PORT` environment variable to override: `PORT=4000 npm start`

---

## HTML Pages

These routes serve rendered Pug templates.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Home page |
| `GET` | `/products` | All products listing |
| `GET` | `/products/:name` | Single product detail page |
| `GET` | `/login` | Login page |
| `POST` | `/login` | Login form submission (redirects to `/`) |
| `GET` | `/profile` | User profile page |
| `GET` | `/cart` | Shopping cart page |

---

## API Endpoints

All JSON API routes are prefixed with `/api/products`.

### `GET /api/products`
Returns all products as a JSON array.

```bash
curl http://localhost:3000/api/products
```

**Response 200**
```json
[
  { "id": 1, "name": "slim fit jeans", "category": "jeans", ... },
  ...
]
```

---

### `HEAD /api/products`
Returns the total product count in the `X-Product-Count` response header. No body is returned.

```bash
curl -I http://localhost:3000/api/products
```

**Response 200** (headers only)
```
X-Product-Count: 5
```

---

### `GET /api/products/:name`
Retrieves a single product by name. The lookup is **case-insensitive**.

```bash
curl http://localhost:3000/api/products/slim%20fit%20jeans
curl http://localhost:3000/api/products/Chino%20Pants
```

**Response 200**
```json
{ "id": 4, "name": "chino pants", "category": "pants", ... }
```

**Response 404** — product not found
```json
{ "error": "Product \"joggers\" not found." }
```

---

### `POST /api/products/add`
Creates a new product. All fields except `inStock` are required.

```bash
curl -X POST http://localhost:3000/api/products/add \
  -H "Content-Type: application/json" \
  -d '{
    "name": "athletic joggers",
    "category": "pants",
    "brand": "Nike",
    "price": 55.00,
    "sizes": ["S", "M", "L", "XL"],
    "color": "dark gray",
    "inStock": true
  }'
```

**Response 201** — created
```json
{
  "id": 6,
  "name": "athletic joggers",
  "category": "pants",
  "brand": "Nike",
  "price": 55,
  "sizes": ["S", "M", "L", "XL"],
  "color": "dark gray",
  "inStock": true
}
```

**Response 400** — validation error
```json
{
  "error": "Validation failed",
  "details": ["price must be a positive number"]
}
```

**Response 409** — duplicate name
```json
{ "error": "Product \"athletic joggers\" already exists." }
```

---

### `DELETE /api/products/:name`
Removes a product by name. Case-insensitive. Returns **no body** on success.

```bash
curl -X DELETE http://localhost:3000/api/products/chino%20pants
```

**Response 204** — deleted (no body)

**Response 404** — product not found
```json
{ "error": "Product \"chino pants\" not found." }
```

---

## Status Code Summary

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (DELETE success) |
| 400 | Bad Request (validation failed) |
| 404 | Not Found |
| 409 | Conflict (duplicate name) |
