window.UI = (function () {
  function formatPrice(toman) {
    if (toman == null) return '';
    return new Intl.NumberFormat('fa-IR').format(toman) + ' تومان';
  }

  function toast(message, type = '') {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`.trim();
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function productCard(p) {
    const outOfStock = !p.stock || p.stock <= 0;
    const brandName = p.brands ? p.brands.name : '';
    const img = p.image_url || 'https://placehold.co/400x400/F6EAD4/818263?text=%D8%AF%D9%84%D8%B3%D8%A7%D9%86%D8%A7';
    return el(`
      <article class="product-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${escapeHtml(p.name)}">
        <div class="product-card__img-wrap">
          <img class="product-card__img" src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
          ${outOfStock ? `<span class="badge badge-danger product-card__badge">ناموجود</span>` : ''}
        </div>
        <div class="product-card__body">
          ${brandName ? `<div class="product-card__brand">${escapeHtml(brandName)}</div>` : ''}
          <div class="product-card__name">${escapeHtml(p.name)}</div>
          <div class="product-card__price">${outOfStock ? '' : formatPrice(p.page_price)}</div>
          <button class="product-card__btn" data-open-product="${p.id}">لینک‌های سفارش</button>
        </div>
      </article>
    `);
  }

  function skeletonCard() {
    return el(`
      <div class="product-card" aria-hidden="true">
        <div class="skeleton" style="aspect-ratio:1/1;"></div>
        <div class="product-card__body">
          <div class="skeleton" style="height:12px;width:50%;margin-bottom:6px;"></div>
          <div class="skeleton" style="height:16px;width:90%;margin-bottom:6px;"></div>
          <div class="skeleton" style="height:14px;width:60%;"></div>
        </div>
      </div>
    `);
  }

  return { formatPrice, toast, el, escapeHtml, productCard, skeletonCard };
})();
