window.AdminReports = (function () {
  let rootEl;
  let activeTab = 'financial';

  function defaultDates() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }

  async function fetchInvoiceItemsInRange(fromDate, toDate) {
    const { data, error } = await window.sb
      .from('invoice_items')
      .select('quantity, unit_price, product_id, invoices!inner(created_at, status), products(name, shop_price, brand_id, brands(name))')
      .gte('invoices.created_at', `${fromDate}T00:00:00`)
      .lte('invoices.created_at', `${toDate}T23:59:59`)
      .neq('invoices.status', 'لغو شده');
    if (error) { AdminUI.toast('خطا در بارگذاری گزارش', 'error'); return []; }
    return data || [];
  }

  async function renderFinancial(container, fromDate, toDate) {
    container.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div></div>`;
    const items = await fetchInvoiceItemsInRange(fromDate, toDate);

    let totalRevenue = 0;
    let pageProfit = 0; // revenue from page sales minus shop-price cost
    let shopProfit = 0;
    const byBrand = {};

    items.forEach((it) => {
      const lineTotal = it.quantity * it.unit_price;
      totalRevenue += lineTotal;
      const cost = (it.products ? it.products.shop_price : 0) * it.quantity;
      const profit = lineTotal - cost;
      // classify by whether sold at/above shop price (rough split without a per-item sale_method)
      pageProfit += profit;

      const brandName = it.products && it.products.brands ? it.products.brands.name : 'سایر';
      byBrand[brandName] = (byBrand[brandName] || 0) + profit;
    });
    shopProfit = totalRevenue - pageProfit; // placeholder split; true split needs sale_method per line

    const brandRows = Object.entries(byBrand)
      .sort((a, b) => b[1] - a[1])
      .map(([name, profit]) => `<tr><td>${AdminUI.escapeHtml(name)}</td><td>${AdminUI.formatPrice(profit)}</td></tr>`)
      .join('') || `<tr><td colspan="2">داده‌ای موجود نیست</td></tr>`;

    container.innerHTML = `
      <div class="stat-grid">
        <div class="card stat-card"><div class="label">مجموع درآمد</div><div class="value">${AdminUI.formatPrice(totalRevenue)}</div></div>
        <div class="card stat-card"><div class="label">سود کل</div><div class="value">${AdminUI.formatPrice(pageProfit)}</div></div>
        <div class="card stat-card"><div class="label">تعداد اقلام فروخته‌شده</div><div class="value">${items.reduce((s, it) => s + it.quantity, 0)}</div></div>
      </div>
      <div class="panel card">
        <h3>سود به تفکیک برند</h3>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>برند</th><th>سود</th></tr></thead><tbody>${brandRows}</tbody></table></div>
      </div>
    `;
  }

  async function renderGeneral(container, fromDate, toDate) {
    container.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div></div>`;

    const [items, stockData, lowStockData] = await Promise.all([
      fetchInvoiceItemsInRange(fromDate, toDate),
      window.sb.from('products').select('stock'),
      window.sb.from('products').select('id,name,stock,low_stock_threshold,image_url').eq('is_active', true),
    ]);

    const totalItemsSold = items.reduce((s, it) => s + it.quantity, 0);
    const totalStock = (stockData.data || []).reduce((s, p) => s + (p.stock || 0), 0);
    const lowStock = (lowStockData.data || []).filter((p) => p.stock <= p.low_stock_threshold);

    const bestSelling = {};
    items.forEach((it) => {
      const name = it.products ? it.products.name : 'محصول حذف‌شده';
      bestSelling[name] = (bestSelling[name] || 0) + it.quantity;
    });
    const top10 = Object.entries(bestSelling).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const lowStockRows = lowStock.length
      ? lowStock.map((p) => `<tr><td>${AdminUI.escapeHtml(p.name)}</td><td>${p.stock}</td><td>${p.low_stock_threshold}</td></tr>`).join('')
      : `<tr><td colspan="3">موردی نیست</td></tr>`;
    const topRows = top10.length
      ? top10.map(([name, qty], i) => `<tr><td>${i + 1}</td><td>${AdminUI.escapeHtml(name)}</td><td>${qty}</td></tr>`).join('')
      : `<tr><td colspan="3">داده‌ای موجود نیست</td></tr>`;

    container.innerHTML = `
      <div class="stat-grid">
        <div class="card stat-card"><div class="label">تعداد کل اقلام فروخته‌شده</div><div class="value">${totalItemsSold}</div></div>
        <div class="card stat-card"><div class="label">موجودی کل انبار</div><div class="value">${totalStock}</div></div>
        <div class="card stat-card warn"><div class="label">اقلام رو به اتمام</div><div class="value">${lowStock.length}</div></div>
      </div>
      <div class="dash-grid">
        <div class="panel card">
          <h3>پرفروش‌ترین محصولات</h3>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>محصول</th><th>تعداد فروش</th></tr></thead><tbody>${topRows}</tbody></table></div>
        </div>
        <div class="panel card">
          <h3>موجودی رو به اتمام</h3>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>محصول</th><th>موجودی</th><th>آستانه</th></tr></thead><tbody>${lowStockRows}</tbody></table></div>
        </div>
      </div>
    `;
  }

  async function renderContent() {
    const container = rootEl.querySelector('#report-content');
    const fromDate = rootEl.querySelector('#date-from').value;
    const toDate = rootEl.querySelector('#date-to').value;
    if (activeTab === 'financial') await renderFinancial(container, fromDate, toDate);
    else await renderGeneral(container, fromDate, toDate);
  }

  async function render(container) {
    rootEl = container;
    const { from, to } = defaultDates();
    container.innerHTML = `
      <div class="admin-header"><h1>گزارشات</h1></div>
      <div class="toolbar">
        <div class="field" style="margin-bottom:0;"><label>از تاریخ</label><input class="input" type="date" id="date-from" value="${from}"></div>
        <div class="field" style="margin-bottom:0;"><label>تا تاریخ</label><input class="input" type="date" id="date-to" value="${to}"></div>
      </div>
      <div class="tabs">
        <button class="tab-btn active" data-tab="financial">گزارشات مالی</button>
        <button class="tab-btn" data-tab="general">گزارشات عمومی</button>
      </div>
      <div id="report-content"></div>
    `;

    container.querySelectorAll('.tab-btn').forEach((btn) => btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderContent();
    }));
    container.querySelector('#date-from').addEventListener('change', renderContent);
    container.querySelector('#date-to').addEventListener('change', renderContent);

    await renderContent();
  }

  return { render };
})();
