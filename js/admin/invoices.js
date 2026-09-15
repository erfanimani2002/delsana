window.AdminInvoices = (function () {
  const PAGE_SIZE = window.APP_CONFIG.ADMIN_PAGE_SIZE;
  let page = 0;
  let search = '';
  let statusFilter = '';
  let rootEl;
  let productCache = [];

  async function fetchPage() {
    let q = window.sb
      .from('invoices')
      .select('id,invoice_number,customer_first_name,customer_last_name,customer_phone,total_price,status,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (search) q = q.or(`customer_first_name.ilike.%${search}%,customer_last_name.ilike.%${search}%,customer_phone.ilike.%${search}%,invoice_number.ilike.%${search}%`);
    if (statusFilter) q = q.eq('status', statusFilter);
    const from = page * PAGE_SIZE, to = from + PAGE_SIZE - 1;
    const { data, count, error } = await q.range(from, to);
    if (error) { AdminUI.toast('خطا در بارگذاری فاکتورها', 'error'); return { rows: [], count: 0 }; }
    return { rows: data || [], count: count || 0 };
  }

  function statusBadge(status) {
    const map = {
      'در انتظار ارسال': 'warning',
      'ارسال شده': 'muted',
      'تحویل شده': 'success',
      'لغو شده': 'danger',
      'مرجوع شده': 'danger',
    };
    return `<span class="badge badge-${map[status] || 'muted'}">${status}</span>`;
  }

  function rowHtml(inv) {
    const name = `${inv.customer_first_name || ''} ${inv.customer_last_name || ''}`.trim() || '—';
    return `
      <tr data-id="${inv.id}">
        <td class="ltr-nums">${AdminUI.escapeHtml(inv.invoice_number)}</td>
        <td>${AdminUI.formatDate(inv.created_at)}</td>
        <td>${AdminUI.escapeHtml(name)}</td>
        <td class="ltr-nums">${AdminUI.escapeHtml(inv.customer_phone || '—')}</td>
        <td>${AdminUI.formatPrice(inv.total_price)}</td>
        <td>${statusBadge(inv.status)}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-outline" data-edit="${inv.id}">ویرایش</button>
          <button class="btn btn-sm btn-danger" data-delete="${inv.id}">حذف</button>
        </td>
      </tr>
    `;
  }

  async function loadProductCache() {
    const { data } = await window.sb.from('products').select('id,name,page_price,stock,brands(name)').eq('is_active', true).order('name');
    productCache = data || [];
  }

  function lineItemRow(item, idx) {
    const options = productCache.map((p) => `<option value="${p.id}" ${item && item.product_id === p.id ? 'selected' : ''}>${AdminUI.escapeHtml(p.name)}${p.brands ? ' - ' + AdminUI.escapeHtml(p.brands.name) : ''} (موجودی: ${p.stock})</option>`).join('');
    return `
      <div class="line-item" data-idx="${idx}">
        <select class="input line-product">
          <option value="">— انتخاب محصول —</option>
          ${options}
        </select>
        <input class="input line-qty" type="number" min="1" value="${item ? item.quantity : 1}" placeholder="تعداد">
        <input class="input line-price" type="number" min="0" value="${item ? item.unit_price : ''}" placeholder="قیمت واحد">
        <button type="button" class="btn btn-icon btn-sm btn-danger line-remove" aria-label="حذف ردیف">✕</button>
      </div>
    `;
  }

  function computeTotal(container) {
    let total = 0;
    container.querySelectorAll('.line-item').forEach((row) => {
      const qty = Number(row.querySelector('.line-qty').value) || 0;
      const price = Number(row.querySelector('.line-price').value) || 0;
      total += qty * price;
    });
    container.closest('.modal').querySelector('#invoice-total').textContent = AdminUI.formatPrice(total);
    return total;
  }

  async function formModal(invoice) {
    await loadProductCache();
    const isEdit = !!invoice;
    let items = [];
    if (isEdit) {
      const { data } = await window.sb.from('invoice_items').select('*').eq('invoice_id', invoice.id);
      items = data || [];
    }

    const saleOptions = window.APP_CONFIG.SALE_METHODS.map((m) => `<option value="${m}" ${invoice && invoice.sale_method === m ? 'selected' : ''}>${m}</option>`).join('');
    const shipOptions = window.APP_CONFIG.SHIPPING_METHODS.map((m) => `<option value="${m}" ${invoice && invoice.shipping_method === m ? 'selected' : ''}>${m}</option>`).join('');
    const statusOptions = window.APP_CONFIG.INVOICE_STATUSES.map((m) => `<option value="${m}" ${invoice && invoice.status === m ? 'selected' : (!invoice && m === 'در انتظار ارسال' ? 'selected' : '')}>${m}</option>`).join('');

    const overlay = AdminUI.el(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:680px;">
          <button class="modal-close" aria-label="بستن">✕</button>
          <h2>${isEdit ? 'ویرایش فاکتور' : 'ثبت فاکتور جدید'}</h2>
          <form id="invoice-form">
            <div class="form-row">
              <div class="field"><label>نام</label><input class="input" name="customer_first_name" value="${invoice ? AdminUI.escapeHtml(invoice.customer_first_name || '') : ''}"></div>
              <div class="field"><label>نام خانوادگی</label><input class="input" name="customer_last_name" value="${invoice ? AdminUI.escapeHtml(invoice.customer_last_name || '') : ''}"></div>
            </div>
            <div class="form-row">
              <div class="field"><label>شماره تماس</label><input class="input" name="customer_phone" value="${invoice ? AdminUI.escapeHtml(invoice.customer_phone || '') : ''}"></div>
              <div class="field"><label>کد پستی</label><input class="input" name="postal_code" value="${invoice ? AdminUI.escapeHtml(invoice.postal_code || '') : ''}"></div>
            </div>
            <div class="field"><label>آدرس</label><textarea class="input" name="customer_address">${invoice ? AdminUI.escapeHtml(invoice.customer_address || '') : ''}</textarea></div>

            <div class="form-row">
              <div class="field"><label>روش فروش</label><select class="input" name="sale_method">${saleOptions}</select></div>
              <div class="field"><label>روش ارسال</label><select class="input" name="shipping_method">${shipOptions}</select></div>
              <div class="field"><label>وضعیت</label><select class="input" name="status">${statusOptions}</select></div>
            </div>

            <div class="field">
              <label>شماره فاکتور ${isEdit ? '' : '(خالی = تولید خودکار)'}</label>
              <input class="input" name="invoice_number" value="${invoice ? AdminUI.escapeHtml(invoice.invoice_number) : ''}" ${isEdit ? 'readonly' : ''}>
            </div>

            <h3 style="margin-top:20px;">اقلام فاکتور</h3>
            <div class="line-items" id="line-items">
              ${items.length ? items.map((it, i) => lineItemRow(it, i)).join('') : lineItemRow(null, 0)}
            </div>
            <button type="button" class="btn btn-sm btn-secondary" id="add-line-btn">+ افزودن ردیف</button>

            <div class="invoice-total-row"><span>جمع کل</span><span id="invoice-total">${AdminUI.formatPrice(invoice ? invoice.total_price : 0)}</span></div>

            <div class="field"><label>یادداشت</label><textarea class="input" name="notes">${invoice ? AdminUI.escapeHtml(invoice.notes || '') : ''}</textarea></div>

            <div style="display:flex; gap:10px; margin-top:10px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">${isEdit ? 'ذخیره تغییرات' : 'ثبت فاکتور'}</button>
              <button type="button" class="btn btn-outline" data-action="cancel">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    `);

    const lineItemsWrap = overlay.querySelector('#line-items');

    function wireLineRow(row) {
      const productSel = row.querySelector('.line-product');
      const priceInput = row.querySelector('.line-price');
      const qtyInput = row.querySelector('.line-qty');
      productSel.addEventListener('change', () => {
        const p = productCache.find((x) => x.id === productSel.value);
        if (p && !priceInput.dataset.userEdited) priceInput.value = p.page_price || 0;
        computeTotal(lineItemsWrap);
      });
      priceInput.addEventListener('input', () => { priceInput.dataset.userEdited = 'true'; computeTotal(lineItemsWrap); });
      qtyInput.addEventListener('input', () => computeTotal(lineItemsWrap));
      row.querySelector('.line-remove').addEventListener('click', () => {
        if (lineItemsWrap.querySelectorAll('.line-item').length <= 1) { row.querySelectorAll('input,select').forEach((i) => i.value = ''); return; }
        row.remove();
        computeTotal(lineItemsWrap);
      });
    }
    lineItemsWrap.querySelectorAll('.line-item').forEach(wireLineRow);
    computeTotal(lineItemsWrap);

    overlay.querySelector('#add-line-btn').addEventListener('click', () => {
      const idx = lineItemsWrap.querySelectorAll('.line-item').length;
      const row = AdminUI.el(lineItemRow(null, idx));
      lineItemsWrap.appendChild(row);
      wireLineRow(row);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.dataset.action === 'cancel' || e.target.classList.contains('modal-close')) overlay.remove();
    });

    overlay.querySelector('#invoice-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const submitBtn = e.target.querySelector('button[type="submit"]');

      const lineRows = [...lineItemsWrap.querySelectorAll('.line-item')]
        .map((row) => ({
          product_id: row.querySelector('.line-product').value || null,
          quantity: Number(row.querySelector('.line-qty').value) || 0,
          unit_price: Number(row.querySelector('.line-price').value) || 0,
        }))
        .filter((it) => it.product_id && it.quantity > 0);

      if (!lineRows.length) { AdminUI.toast('حداقل یک قلم کالا اضافه کنید', 'error'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'در حال ذخیره...';

      const total = lineRows.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
      const payload = {
        customer_first_name: fd.get('customer_first_name') || null,
        customer_last_name: fd.get('customer_last_name') || null,
        customer_phone: fd.get('customer_phone') || null,
        customer_address: fd.get('customer_address') || null,
        postal_code: fd.get('postal_code') || null,
        sale_method: fd.get('sale_method'),
        shipping_method: fd.get('shipping_method') || null,
        status: fd.get('status'),
        total_price: total,
        notes: fd.get('notes') || null,
      };
      const manualNumber = fd.get('invoice_number');
      if (!isEdit && manualNumber) payload.invoice_number = manualNumber;

      try {
        let invoiceId;
        if (isEdit) {
          invoiceId = invoice.id;
          const { error } = await window.sb.from('invoices').update(payload).eq('id', invoiceId);
          if (error) throw error;
          // Remove old items (trigger restores stock), then reinsert (trigger decrements again)
          const { error: delErr } = await window.sb.from('invoice_items').delete().eq('invoice_id', invoiceId);
          if (delErr) throw delErr;
        } else {
          const { data, error } = await window.sb.from('invoices').insert(payload).select().single();
          if (error) throw error;
          invoiceId = data.id;
        }
        const { error: itemsErr } = await window.sb.from('invoice_items').insert(
          lineRows.map((it) => ({ ...it, invoice_id: invoiceId }))
        );
        if (itemsErr) throw itemsErr;

        AdminUI.toast('فاکتور ذخیره شد', 'success');
        overlay.remove();
        renderTable();
      } catch (err) {
        console.error(err);
        AdminUI.toast('خطا: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'ذخیره تغییرات' : 'ثبت فاکتور';
      }
    });

    document.body.appendChild(overlay);
  }

  async function renderTable() {
    const { rows, count } = await fetchPage();
    const tbody = rootEl.querySelector('tbody');
    tbody.innerHTML = rows.length ? rows.map(rowHtml).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="icon">🧾</div><p>فاکتوری یافت نشد</p></div></td></tr>`;

    tbody.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', async () => {
      const { data } = await window.sb.from('invoices').select('*').eq('id', btn.dataset.edit).single();
      formModal(data);
    }));
    tbody.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
      const ok = await AdminUI.confirmDialog('این فاکتور حذف شود؟ موجودی کالاها بازگردانده می‌شود.');
      if (!ok) return;
      const { error } = await window.sb.from('invoices').delete().eq('id', btn.dataset.delete);
      if (error) AdminUI.toast('خطا در حذف', 'error');
      else { AdminUI.toast('فاکتور حذف شد', 'success'); renderTable(); }
    }));

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
    page = 0; search = ''; statusFilter = '';
    const statusOptions = window.APP_CONFIG.INVOICE_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
    container.innerHTML = `
      <div class="admin-header"><h1>فاکتورها</h1><button class="btn btn-primary" id="add-invoice-btn">+ ثبت فاکتور جدید</button></div>
      <div class="toolbar">
        <input class="input" id="invoice-search" placeholder="جستجو با نام یا شماره تماس...">
        <select class="input" id="status-filter" style="max-width:180px;"><option value="">همه وضعیت‌ها</option>${statusOptions}</select>
      </div>
      <div class="table-wrap card">
        <table class="data-table">
          <thead><tr><th>شماره</th><th>تاریخ</th><th>مشتری</th><th>تماس</th><th>مبلغ کل</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="pagination"></div>
    `;

    let debounce;
    container.querySelector('#invoice-search').addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { search = e.target.value.trim(); page = 0; renderTable(); }, 300);
    });
    container.querySelector('#status-filter').addEventListener('change', (e) => { statusFilter = e.target.value; page = 0; renderTable(); });
    container.querySelector('#add-invoice-btn').addEventListener('click', () => formModal(null));

    await renderTable();
  }

  return { render };
})();
