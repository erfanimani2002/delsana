window.ProductModal = (function () {
  let overlayEl = null;
  let settings = null;
  let previouslyFocused = null;

  function setSettings(s) { settings = s; }

  function close() {
    if (overlayEl) {
      overlayEl.classList.add('closing');
      setTimeout(() => {
        overlayEl.remove();
        overlayEl = null;
        document.removeEventListener('keydown', onKeydown);
        if (previouslyFocused) {
          previouslyFocused.focus();
          previouslyFocused = null;
        }
      }, 200);
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'Tab' && overlayEl) {
      trapFocus(e);
    }
  }

  function trapFocus(e) {
    const focusableElements = overlayEl.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  function waLink(productName) {
    const msg = encodeURIComponent(`سلام، درباره محصول «${productName}» سوال داشتم.`);
    const base = (settings && settings.whatsapp_link) || 'https://wa.me/';
    const sep = base.includes('?') ? '&' : '?';
    return base.includes('text=') ? base : `${base}${sep}text=${msg}`;
  }

  async function open(productId) {
    close();
    previouslyFocused = document.activeElement;
    const p = await window.Products.fetchOne(productId);
    if (!p) {
      UI.toast('محصول یافت نشد', 'error');
      return;
    }

    const outOfStock = !p.stock || p.stock <= 0;
    const brandName = p.brands ? p.brands.name : '';
    const img = p.image_url || 'https://placehold.co/600x450/F8F9FA/171717?text=%D8%AF%D9%84%D8%B3%D8%A7%D9%86%D8%A7';

    overlayEl = UI.el(`
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="${UI.escapeHtml(p.name)}">
        <div class="modal">
          <button class="modal-close" aria-label="بستن">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <div class="product-modal__img"><img src="${img}" alt="${UI.escapeHtml(p.name)}"></div>
          ${brandName ? `<div class="product-modal__brand">${UI.escapeHtml(brandName)}</div>` : ''}
          <h2>${UI.escapeHtml(p.name)}</h2>
          <div class="product-modal__price">${outOfStock ? '<span class="badge badge-danger">ناموجود</span>' : UI.formatPrice(p.page_price)}</div>
          ${p.description ? `<p class="product-modal__desc">${UI.escapeHtml(p.description)}</p>` : ''}
          <div class="order-links">
            ${settings && settings.instagram_link ? `<a class="btn btn-primary" target="_blank" rel="noopener" href="${settings.instagram_link}">پیام در اینستاگرام</a>` : ''}
            ${settings && settings.whatsapp_link ? `<a class="btn btn-secondary" target="_blank" rel="noopener" href="${waLink(p.name)}">پیام در واتساپ</a>` : ''}
            ${p.snapshop_url ? `<a class="btn btn-outline" target="_blank" rel="noopener" href="${p.snapshop_url}">خرید در اسنپ‌شاپ</a>` : ''}
          </div>
        </div>
      </div>
    `);

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });
    overlayEl.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlayEl);
    overlayEl.querySelector('.modal-close').focus();
  }

  return { open, close, setSettings };
})();
