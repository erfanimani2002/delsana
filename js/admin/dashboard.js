window.AdminDashboard = (function () {
  function todayRange() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  async function render(container) {
    container.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div></div>`;
    const { start, end } = todayRange();

    const [todayInvoices, stockData, recentInvoices] = await Promise.all([
      window.sb.from('invoices').select('id,total_price').gte('created_at', start).lte('created_at', end).neq('status', 'لغو شده'),
      window.sb.from('products').select('id,name,stock,low_stock_threshold').eq('is_active', true),
      window.sb.from('invoices').select('id,invoice_number,customer_first_name,customer_last_name,total_price,status,created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    const todayRevenue = (todayInvoices.data || []).reduce((s, i) => s + (i.total_price || 0), 0);
    const todayCount = (todayInvoices.data || []).length;
    const totalStock = (stockData.data || []).reduce((s, p) => s + (p.stock || 0), 0);
    const lowStock = (stockData.data || []).filter((p) => p.stock <= p.low_stock_threshold);

    // Revenue by brand (last 30 days)
    const from30 = new Date(); from30.setDate(from30.getDate() - 30);
    const { data: itemsData } = await window.sb
      .from('invoice_items')
      .select('quantity,unit_price,invoices!inner(created_at,status),products(brand_id,brands(name))')
      .gte('invoices.created_at', from30.toISOString())
      .neq('invoices.status', 'لغو شده');

    const byBrand = {};
    (itemsData || []).forEach((it) => {
      const name = it.products && it.products.brands ? it.products.brands.name : 'سایر';
      byBrand[name] = (byBrand[name] || 0) + it.quantity * it.unit_price;
    });
    const brandEntries = Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxVal = Math.max(1, ...brandEntries.map((e) => e[1]));

    const pieRows = brandEntries.length
      ? brandEntries.map(([name, val]) => `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <div style="width:80px; font-size:var(--fs-xs); color:var(--text-muted);">${AdminUI.escapeHtml(name)}</div>
            <div style="flex:1; background:var(--bg-alt); border-radius:6px; overflow:hidden; height:14px;">
              <div style="width:${(val / maxVal) * 100}%; background:var(--color-olive); height:100%;"></div>
            </div>
            <div style="font-size:var(--fs-xs); font-weight:600;" class="ltr-nums">${AdminUI.formatPrice(val)}</div>
          </div>
        `).join('')
      : `<p class="empty-state">داده‌ای برای نمایش نیست</p>`;

    const invoiceRows = (recentInvoices.data || []).length
      ? recentInvoices.data.map((inv) => `
          <tr>
            <td class="ltr-nums">${AdminUI.escapeHtml(inv.invoice_number)}</td>
            <td>${AdminUI.escapeHtml(`${inv.customer_first_name || ''} ${inv.customer_last_name || ''}`.trim() || '—')}</td>
            <td>${AdminUI.formatPrice(inv.total_price)}</td>
            <td><span class="badge badge-muted">${inv.status}</span></td>
          </tr>
        `).join('')
      : `<tr><td colspan="4">فاکتوری ثبت نشده</td></tr>`;

    const lowStockRows = lowStock.length
      ? lowStock.slice(0, 8).map((p) => `<tr><td>${AdminUI.escapeHtml(p.name)}</td><td>${p.stock}</td></tr>`).join('')
      : `<tr><td colspan="2">موردی نیست</td></tr>`;

    container.innerHTML = `
      <div class="admin-header"><h1>داشبورد</h1></div>
      <div class="stat-grid">
        <div class="card stat-card"><div class="label">مجموع درآمد امروز</div><div class="value">${AdminUI.formatPrice(todayRevenue)}</div></div>
        <div class="card stat-card"><div class="label">تعداد فاکتورهای امروز</div><div class="value">${todayCount}</div></div>
        <div class="card stat-card"><div class="label">موجودی کل انبار</div><div class="value">${totalStock}</div></div>
        <div class="card stat-card warn"><div class="label">اقلام رو به اتمام</div><div class="value">${lowStock.length}</div></div>
      </div>
      <div class="dash-grid">
        <div class="panel card">
          <h3>درآمد به تفکیک برند (۳۰ روز اخیر)</h3>
          ${pieRows}
        </div>
        <div class="panel card">
          <h3>هشدار موجودی کم</h3>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>محصول</th><th>موجودی</th></tr></thead><tbody>${lowStockRows}</tbody></table></div>
        </div>
      </div>
      <div class="panel card" style="margin-top:20px;">
        <h3>آخرین فاکتورها</h3>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>شماره</th><th>مشتری</th><th>مبلغ</th><th>وضعیت</th></tr></thead><tbody>${invoiceRows}</tbody></table></div>
      </div>
    `;
  }

  return { render };
})();
