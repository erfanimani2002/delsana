window.AdminCategories = (function () {
  let rootEl;

  async function fetchAll() {
    const { data: cats, error } = await window.sb
      .from('categories')
      .select('id,name,image_url,sort_order,is_active')
      .order('sort_order');
    if (error) { AdminUI.toast('خطا در بارگذاری دسته‌بندی‌ها', 'error'); return []; }

    const { data: counts } = await window.sb.from('products').select('category_id');
    const countMap = {};
    (counts || []).forEach((p) => { if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1; });

    return (cats || []).map((c) => ({ ...c, product_count: countMap[c.id] || 0 }));
  }

  function formModal(cat) {
    const isEdit = !!cat;
    const overlay = AdminUI.el(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:420px;">
          <button class="modal-close" aria-label="بستن">✕</button>
          <h2>${isEdit ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی'}</h2>
          <form id="cat-form">
            <div class="field">
              <label>نام دسته‌بندی</label>
              <input class="input" name="name" required value="${cat ? AdminUI.escapeHtml(cat.name) : ''}">
            </div>
            <div class="field">
              <label>ترتیب نمایش</label>
              <input class="input" name="sort_order" type="number" value="${cat ? cat.sort_order : 0}">
            </div>
            <div class="field">
              <label>عکس</label>
              <div class="image-drop" id="image-drop">برای آپلود کلیک کنید</div>
              <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
              <img id="image-preview" class="image-preview" style="${cat && cat.image_url ? '' : 'display:none;'}" src="${cat ? cat.image_url || '' : ''}">
            </div>
            <label class="toggle" style="margin-bottom:20px;">
              <input type="checkbox" name="is_active" ${!cat || cat.is_active ? 'checked' : ''}>
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

    let uploadedUrl = cat ? cat.image_url : null;
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

    overlay.querySelector('#cat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        if (file) uploadedUrl = await AdminUI.uploadImage(file);
        const payload = {
          name: fd.get('name'),
          sort_order: Number(fd.get('sort_order')) || 0,
          image_url: uploadedUrl,
          is_active: fd.get('is_active') === 'on',
        };
        const { error } = isEdit
          ? await window.sb.from('categories').update(payload).eq('id', cat.id)
          : await window.sb.from('categories').insert(payload);
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
    const cats = await fetchAll();
    const tbody = rootEl.querySelector('tbody');
    tbody.innerHTML = cats.length ? cats.map((c) => `
      <tr data-id="${c.id}">
        <td><img class="thumb" src="${c.image_url || 'https://placehold.co/80x80/F6EAD4/818263?text=%D8%AF'}" alt=""></td>
        <td>${AdminUI.escapeHtml(c.name)}</td>
        <td>${c.sort_order}</td>
        <td>${c.product_count}</td>
        <td>${c.is_active ? '<span class="badge badge-success">فعال</span>' : '<span class="badge badge-muted">غیرفعال</span>'}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-outline" data-edit="${c.id}">ویرایش</button>
          <button class="btn btn-sm btn-danger" data-delete="${c.id}">حذف</button>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="icon">🗂️</div><p>دسته‌بندی‌ای ثبت نشده</p></div></td></tr>`;

    tbody.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
      const c = cats.find((x) => x.id === btn.dataset.edit);
      formModal(c);
    }));
    tbody.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
      const ok = await AdminUI.confirmDialog('این دسته‌بندی حذف شود؟');
      if (!ok) return;
      const { error } = await window.sb.from('categories').delete().eq('id', btn.dataset.delete);
      if (error) AdminUI.toast('خطا در حذف', 'error');
      else { AdminUI.toast('حذف شد', 'success'); renderList(); }
    }));
  }

  async function render(container) {
    rootEl = container;
    container.innerHTML = `
      <div class="admin-header"><h1>دسته‌بندی‌ها</h1><button class="btn btn-primary" id="add-cat-btn">+ افزودن دسته‌بندی</button></div>
      <div class="table-wrap card">
        <table class="data-table">
          <thead><tr><th>عکس</th><th>نام</th><th>ترتیب</th><th>تعداد محصول</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    container.querySelector('#add-cat-btn').addEventListener('click', () => formModal(null));
    await renderList();
  }

  return { render };
})();
