window.AdminUI = (function () {
  function formatPrice(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('fa-IR').format(n) + ' تومان';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
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

  // Simple confirm modal, returns a Promise<boolean>
  function confirmDialog(message, confirmLabel = 'حذف') {
    return new Promise((resolve) => {
      const overlay = el(`
        <div class="modal-overlay">
          <div class="modal" style="max-width:380px; text-align:center;">
            <p style="margin-bottom:24px;">${escapeHtml(message)}</p>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-outline" style="flex:1;" data-action="cancel">انصراف</button>
              <button class="btn btn-danger" style="flex:1;" data-action="confirm">${escapeHtml(confirmLabel)}</button>
            </div>
          </div>
        </div>
      `);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
        const action = e.target.dataset.action;
        if (action) { overlay.remove(); resolve(action === 'confirm'); }
      });
      document.body.appendChild(overlay);
    });
  }

  // Uploads a File to the product-images bucket, returns its public URL
  async function uploadImage(file) {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await window.sb.storage
      .from(window.APP_CONFIG.IMAGE_BUCKET)
      .upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = window.sb.storage.from(window.APP_CONFIG.IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  function calcPagePrice(shopPrice, coefficient, roundingUnit) {
    const raw = shopPrice * coefficient;
    return Math.ceil(raw / roundingUnit) * roundingUnit;
  }

  return { formatPrice, formatDate, toast, el, escapeHtml, confirmDialog, uploadImage, calcPagePrice };
})();
