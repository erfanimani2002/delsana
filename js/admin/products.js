window.AdminProducts = (function () {
  const PAGE_SIZE = window.APP_CONFIG.ADMIN_PAGE_SIZE;
  let page = 0;
  let search = '';
  let brands = [];
  let categories = [];
  let settings = null;

  async function loadLookups() {
    const [b, c, s] = await Promise.all([
      window.sb.from('brands').select('id,name').order('name'),
      window.sb.from('categories').select('id,name').order('sort_order'),
      window.sb.from('settings').select('*').limit(1).single(),
    ]);
    brands = b.data || [];
    categories = c.data || [];
    settings = s.data;
  }

  async function fetchPage() {
    let q = window.sb
      .from('products')
      .select('id,name,image_url,shop_price,page_price,page_price_manual,stock,low_stock_threshold,is_active,brands(name),categories(name)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (search) q = q.ilike('name', `%${search}%`);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count, error } = await q.range(from, to);
    if (error) { AdminUI.toast('خطا در بارگذاری محصولات', 'error'); return { rows: [], count: 0 }; }
    return { rows: data || [], count: count || 0 };
  }

  function rowHtml(p) {
    const outOfStock = p.stock <= 0;
    const low = !outOfStock && p.stock <= p.low_stock_threshold;
    const statusBadge = outOfStock
      ? '<span class="badge badge-danger">ناموجود</span>'
      : low ? '<span class="badge badge-warning">رو به اتمام</span>'
      : '<span class="badge badge-success">موجود</span>';
    return `
      <tr data-id="${p.id}">
        <td><img class="thumb" src="${p.image_url || 'https://placehold.co/80x80/F6EAD4/818263?text=%D8%AF'}" alt=""></td>
        <td>${AdminUI.escapeHtml(p.name)}</td>
        <td>${p.brands ? AdminUI.escapeHtml(p.brands.name) : '—'}</td>
        <td>${AdminUI.formatPrice(p.shop_price)}</td>
        <td>${AdminUI.formatPrice(p.page_price)}</td>
        <td>${p.stock}</td>
        <td>${statusBadge}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-outline" data-edit="${p.id}">ویرایش</button>
          <button class="btn btn-sm btn-danger" data-delete="${p.id}">حذف</button>
        </td>
      </tr>
    `;
  }

  function formModal(product) {
    const isEdit = !!product;
    const brandOptions = brands.map((b) => `<option value="${b.id}" ${product && product.brand_id === b.id ? 'selected' : ''}>${AdminUI.escapeHtml(b.name)}</option>`).join('');
    const catOptions = categories.map((c) => `<option value="${c.id}" ${product && product.category_id === c.id ? 'selected' : ''}>${AdminUI.escapeHtml(c.name)}</option>`).join('');

    const overlay = AdminUI.el(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:640px;">
          <button class="modal-close" aria-label="بستن">✕</button>
          <h2>${isEdit ? 'ویرایش محصول' : 'افزودن محصول'}</h2>
          <form id="product-form">
            <div class="field">
              <label>نام محصول</label>
              <input class="input" name="name" required value="${product ? AdminUI.escapeHtml(product.name) : ''}">
            </div>
            <div class="form-row">
              <div class="field">
                <label>برند</label>
                <select class="input" name="brand_id"><option value="">— انتخاب کنید —</option>${brandOptions}</select>
              </div>
              <div class="field">
                <label>دسته‌بندی</label>
                <select class="input" name="category_id"><option value="">— انتخاب کنید —</option>${catOptions}</select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>قیمت مغازه (تومان)</label>
                <input class="input" name="shop_price" type="number" min="0" required value="${product ? product.shop_price : ''}">
              </div>
              <div class="field">
                <label>قیمت پیج (تومان)</label>
                <input class="input" name="page_price" type="number" min="0" value="${product ? (product.page_price ?? '') : ''}" ${product && product.page_price_manual ? '' : 'readonly'}>
                <div class="hint" id="auto-price-hint"></div>
              </div>
            </div>
            <label class="toggle" style="margin-bottom:16px;">
              <input type="checkbox" name="page_price_manual" ${product && product.page_price_manual ? 'checked' : ''}>
              <span class="track"></span>
              قیمت دستی پیج
            </label>
            <div class="form-row">
              <div class="field">
                <label>موجودی</label>
                <input class="input" name="stock" type="number" min="0" required value="${product ? product.stock : 0}">
              </div>
              <div class="field">
                <label>آستانه هشدار موجودی کم</label>
                <input class="input" name="low_stock_threshold" type="number" min="0" value="${product ? product.low_stock_threshold : 5}">
              </div>
            </div>
            <div class="field">
              <label>عکس محصول</label>
              <div class="image-drop" id="image-drop">برای آپلود عکس کلیک کنید (حداکثر ۵ مگابایت)</div>
              <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
              <img id="image-preview" class="image-preview" style="${product && product.image_url ? '' : 'display:none;'}" src="${product ? product.image_url || '' : ''}">
            </div>
            <div class="field">
              <label>توضیحات</label>
              <textarea class="input" name="description">${product ? AdminUI.escapeHtml(product.description || '') : ''}</textarea>
            </div>
            <div class="field">
              <label>لینک اسنپ‌شاپ</label>
              <input class="input" name="snapshop_url" type="url" value="${product ? AdminUI.escapeHtml(product.snapshop_url || '') : ''}">
            </div>
            <label class="toggle" style="margin-bottom:20px;">
              <input type="checkbox" name="is_active" ${!product || product.is_active ? 'checked' : ''}>
              <span class="track"></span>
              فعال (نمایش در فروشگاه)
            </label>
            <div style="display:flex; gap:10px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">${isEdit ? 'ذخیره تغییرات' : 'افزودن محصول'}</button>
              <button type="button" class="btn btn-outline" data-action="cancel">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    `);

    let uploadedImageUrl = product ? product.image_url : null;
    let imageFile = null;

    const shopPriceInput = overlay.querySelector('[name="shop_price"]');
    const pagePriceInput = overlay.querySelector('[name="page_price"]');
    const manualToggle = overlay.querySelector('[name="page_price_manual"]');
    const hint = overlay.querySelector('#auto-price-hint');

    function updateAutoPrice() {
      if (manualToggle.checked) {
        pagePriceInput.readOnly = false;
        hint.textContent = 'قیمت دستی — مستقل از قیمت مغازه';
        return;
      }
      pagePriceInput.readOnly = true;
      const shop = Number(shopPriceInput.value) || 0;
      const coeff = settings ? Number(settings.page_price_coefficient) : 1.35;
      const unit = settings ? Number(settings.rounding_unit) : 10000;
      const auto = AdminUI.calcPagePrice(shop, coeff, unit);
      pagePriceInput.value = shop ? auto : '';
      hint.textContent = `محاسبه خودکار: قیمت مغازه × ${coeff} (رند شده به ${unit.toLocaleString('fa-IR')})`;
    }
    shopPriceInput.addEventListener('input', updateAutoPrice);
    manualToggle.addEventListener('change', updateAutoPrice);
    updateAutoPrice();

    const dropEl = overlay.querySelector('#image-drop');
    const fileInput = overlay.querySelector('#image-input');
    const previewEl = overlay.querySelector('#image-preview');
    dropEl.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      imageFile = fileInput.files[0];
      if (imageFile) {
        previewEl.src = URL.createObjectURL(imageFile);
        previewEl.style.display = '';
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.dataset.action === 'cancel' || e.target.classList.contains('modal-close')) {
        overlay.remove();
      }
    });

    overlay.querySelector('#product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'در حال ذخیره...';
      try {
        if (imageFile) uploadedImageUrl = await AdminUI.uploadImage(imageFile);

        const payload = {
          name: fd.get('name'),
          brand_id: fd.get('brand_id') || null,
          category_id: fd.get('category_id') || null,
          shop_price: Number(fd.get('shop_price')),
          page_price: fd.get('page_price') ? Number(fd.get('page_price')) : null,
          page_price_manual: fd.get('page_price_manual') === 'on',
          stock: Number(fd.get('stock')),
          low_stock_threshold: Number(fd.get('low_stock_threshold')) || 5,
          description: fd.get('description') || null,
          snapshop_url: fd.get('snapshop_url') || null,
          is_active: fd.get('is_active') === 'on',
          image_url: uploadedImageUrl,
        };

        if (isEdit) {
          const { error } = await window.sb.from('products').update(payload).eq('id', product.id);
          if (error) throw error;
          AdminUI.toast('محصول به‌روزرسانی شد', 'success');
        } else {
          const { error } = await window.sb.from('products').insert(payload);
          if (error) throw error;
          AdminUI.toast('محصول افزوده شد', 'success');
        }
        overlay.remove();
        renderTable();
      } catch (err) {
        console.error(err);
        AdminUI.toast('خطا: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'ذخیره تغییرات' : 'افزودن محصول';
      }
    });

    document.body.appendChild(overlay);
  }

  let rootEl;
  async function renderTable() {
    const { rows, count } = await fetchPage();
    const tbody = rootEl.querySelector('tbody');
    tbody.innerHTML = rows.length
      ? rows.map(rowHtml).join('')
      : `<tr><td colspan="8"><div class="empty-state"><div class="icon">📦</div><p>محصولی یافت نشد</p></div></td></tr>`;

    tbody.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', async () => {
      const { data } = await window.sb.from('products').select('*').eq('id', btn.dataset.edit).single();
      formModal(data);
    }));
    tbody.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
      const ok = await AdminUI.confirmDialog('این محصول حذف شود؟');
      if (!ok) return;
      const { error } = await window.sb.from('products').delete().eq('id', btn.dataset.delete);
      if (error) AdminUI.toast('خطا در حذف', 'error');
      else { AdminUI.toast('محصول حذف شد', 'success'); renderTable(); }
    }));

    renderPagination(count);
  }

  function renderPagination(count) {
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const pag = rootEl.querySelector('.pagination');
    pag.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const b = document.createElement('button');
      b.textContent = i + 1;
      if (i === page) b.classList.add('active');
      b.addEventListener('click', () => { page = i; renderTable(); });
      pag.appendChild(b);
    }
  }

  async function render(container) {
    rootEl = container;
    page = 0; search = '';
    container.innerHTML = `
      <div class="admin-header"><h1>محصولات</h1><button class="btn btn-primary" id="add-product-btn">+ افزودن محصول</button></div>
      <div class="toolbar"><input class="input" id="product-search" placeholder="جستجو بر اساس نام..."></div>
      <div class="table-wrap card">
        <table class="data-table">
          <thead><tr><th>عکس</th><th>نام</th><th>برند</th><th>قیمت مغازه</th><th>قیمت پیج</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="pagination"></div>
    `;
    await loadLookups();

    let debounce;
    container.querySelector('#product-search').addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { search = e.target.value.trim(); page = 0; renderTable(); }, 300);
    });
    container.querySelector('#add-product-btn').addEventListener('click', () => formModal(null));

    await renderTable();
  }

  return { render };
})();
