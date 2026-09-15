window.AdminBrands = (function () {
  let rootEl;

  async function fetchAll() {
    const { data: brandsData, error } = await window.sb
      .from('brands')
      .select('id,name,image_url,is_active')
      .order('name');
    if (error) { AdminUI.toast('خطا در بارگذاری برندها', 'error'); return []; }

    // product counts per brand
    const { data: counts } = await window.sb.from('products').select('brand_id');
    const countMap = {};
    (counts || []).forEach((p) => { if (p.brand_id) countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1; });

    return (brandsData || []).map((b) => ({ ...b, product_count: countMap[b.id] || 0 }));
  }

  function formModal(brand) {
    const isEdit = !!brand;
    const overlay = AdminUI.el(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:420px;">
          <button class="modal-close" aria-label="بستن">✕</button>
          <h2>${isEdit ? 'ویرایش برند' : 'افزودن برند'}</h2>
          <form id="brand-form">
            <div class="field">
              <label>نام برند</label>
              <input class="input" name="name" required value="${brand ? AdminUI.escapeHtml(brand.name) : ''}">
            </div>
            <div class="field">
              <label>لوگو</label>
              <div class="image-drop" id="image-drop">برای آپلود کلیک کنید</div>
              <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
              <img id="image-preview" class="image-preview" style="${brand && brand.image_url ? '' : 'display:none;'}" src="${brand ? brand.image_url || '' : ''}">
            </div>
            <label class="toggle" style="margin-bottom:20px;">
              <input type="checkbox" name="is_active" ${!brand || brand.is_active ? 'checked' : ''}>
              <span class="track"></span> فعال
            </label>
            <div style="display:flex; gap:10px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">ذخیره</button>
              <button type="button" class="btn btn-outline" data-action="cancel">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    `);

    let uploadedUrl = brand ? brand.image_url : null;
    let file = null;
    const dropEl = overlay.querySelector('#image-drop');
    const fileInput = overlay.querySelector('#image-input');
    const previewEl = overlay.querySelector('#image-preview');
    dropEl.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      file = fileInput.files[0];
      if (file) { previewEl.src = URL.createObjectURL(file); previewEl.style.display = ''; }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.dataset.action === 'cancel' || e.target.classList.contains('modal-close')) overlay.remove();
    });

    overlay.querySelector('#brand-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        if (file) uploadedUrl = await AdminUI.uploadImage(file);
        const payload = { name: fd.get('name'), image_url: uploadedUrl, is_active: fd.get('is_active') === 'on' };
        const { error } = isEdit
          ? await window.sb.from('brands').update(payload).eq('id', brand.id)
          : await window.sb.from('brands').insert(payload);
        if (error) throw error;
        AdminUI.toast('ذخیره شد', 'success');
        overlay.remove();
        renderList();
      } catch (err) {
        AdminUI.toast('خطا: ' + err.message, 'error');
      }
    });

    document.body.appendChild(overlay);
  }

  async function renderList() {
    const brands = await fetchAll();
    const tbody = rootEl.querySelector('tbody');
    tbody.innerHTML = brands.length ? brands.map((b) => `
      <tr data-id="${b.id}">
        <td><img class="thumb" src="${b.image_url || 'https://placehold.co/80x80/F6EAD4/818263?text=%D8%A8'}" alt=""></td>
        <td>${AdminUI.escapeHtml(b.name)}</td>
        <td>${b.product_count}</td>
        <td>${b.is_active ? '<span class="badge badge-success">فعال</span>' : '<span class="badge badge-muted">غیرفعال</span>'}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-outline" data-edit="${b.id}">ویرایش</button>
          <button class="btn btn-sm btn-danger" data-delete="${b.id}">حذف</button>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="5"><div class="empty-state"><div class="icon">🏷️</div><p>برندی ثبت نشده</p></div></td></tr>`;

    tbody.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
      const b = brands.find((x) => x.id === btn.dataset.edit);
      formModal(b);
    }));
    tbody.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
      const ok = await AdminUI.confirmDialog('این برند حذف شود؟');
      if (!ok) return;
      const { error } = await window.sb.from('brands').delete().eq('id', btn.dataset.delete);
      if (error) AdminUI.toast('خطا در حذف (ممکن است محصولی به این برند وصل باشد)', 'error');
      else { AdminUI.toast('حذف شد', 'success'); renderList(); }
    }));
  }

  async function render(container) {
    rootEl = container;
    container.innerHTML = `
      <div class="admin-header"><h1>برندها</h1><button class="btn btn-primary" id="add-brand-btn">+ افزودن برند</button></div>
      <div class="table-wrap card">
        <table class="data-table">
          <thead><tr><th>لوگو</th><th>نام</th><th>تعداد محصول</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    container.querySelector('#add-brand-btn').addEventListener('click', () => formModal(null));
    await renderList();
  }

  return { render };
})();
