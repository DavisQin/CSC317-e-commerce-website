const VALID_CATEGORIES = ['jeans', 'shirts', 't-shirts', 'jackets', 'pants', 'shorts', 'sweaters', 'coats', 'suits', 'accessories'];

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

function calcTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

module.exports = { validateProduct, calcTotal, VALID_CATEGORIES };