'use strict';

// ── Page fade-in / fade-out ───────────────────────────────────────────────────

document.body.style.opacity = '0';

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.35s ease';
    document.body.style.opacity = '1';
  });
});

document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('javascript') || link.target === '_blank') return;
  link.addEventListener('click', e => {
    e.preventDefault();
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = href; }, 300);
  });
});

// ── Staggered product card slide-up ──────────────────────────────────────────

document.querySelectorAll('.product-card').forEach((card, i) => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(22px)';
  card.style.transition = 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease';
  setTimeout(() => {
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 80 + i * 65);
});

// ── Staggered category card slide-up ─────────────────────────────────────────

document.querySelectorAll('.category-card').forEach((card, i) => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(10px)';
  card.style.transition = 'opacity 0.3s ease, transform 0.3s ease, background 0.15s, color 0.15s';
  setTimeout(() => {
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 50 + i * 40);
});

// ── "Add to Cart" button feedback ─────────────────────────────────────────────

document.querySelectorAll('form').forEach(form => {
  if (!form.action.includes('/cart/add')) return;
  form.addEventListener('submit', () => {
    const btn = form.querySelector('.btn-add');
    if (!btn) return;
    btn.textContent = 'Adding...';
    btn.style.background = '#1a6b2f';
    btn.disabled = true;
  });
});

// ── Cart badge pulse ──────────────────────────────────────────────────────────

document.querySelectorAll('.navbar a[href="/cart"]').forEach(link => {
  if (link.textContent.includes('(')) {
    link.classList.add('cart-badge-pulse');
  }
});

// ── Order list cards slide-in ─────────────────────────────────────────────────

document.querySelectorAll('.order-card').forEach((card, i) => {
  card.style.opacity = '0';
  card.style.transform = 'translateX(-16px)';
  card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  setTimeout(() => {
    card.style.opacity = '1';
    card.style.transform = 'translateX(0)';
  }, 60 + i * 80);
});
