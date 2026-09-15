(function () {
  const routes = {
    '': { label: 'داشبورد', module: window.AdminDashboard, icon: 'dashboard' },
    '/dashboard': { label: 'داشبورد', module: window.AdminDashboard, icon: 'dashboard' },
    '/products': { label: 'محصولات', module: window.AdminProducts, icon: 'products' },
    '/invoices': { label: 'فاکتورها', module: window.AdminInvoices, icon: 'invoices' },
    '/brands': { label: 'برندها', module: window.AdminBrands, icon: 'brands' },
    '/categories': { label: 'دسته‌بندی‌ها', module: window.AdminCategories, icon: 'categories' },
    '/reports': { label: 'گزارشات', module: window.AdminReports, icon: 'reports' },
    '/settings': { label: 'تنظیمات', module: window.AdminSettings, icon: 'settings' },
  };
  const navOrder = ['/dashboard', '/products', '/invoices', '/brands', '/categories', '/reports', '/settings'];
  const tabbarOrder = ['/dashboard', '/products', '/invoices', '/reports'];
  const moreItems = ['/brands', '/categories', '/settings'];

  const appRoot = document.getElementById('app-root');

  function icon(name) {
    const icons = {
      dashboard: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
      products: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
      invoices: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v15H6z"/><path d="M9 12h6M9 16h6M9 8h3"/></svg>',
      brands: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m20.6 13.4-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>',
      categories: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
      reports: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/></svg>',
      settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/></svg>',
      more: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    };
    return icons[name] || '';
  }

  function currentPath() {
    const hash = window.location.hash.replace(/^#/, '');
    return hash === '/login' ? '' : hash;
  }

  function renderShell() {
    appRoot.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div class="admin-sidebar__logo"><img src="../img/logo.jpg" alt="دلسانا شاپ"></div>
          <nav class="admin-nav" id="admin-nav">
            ${navOrder.map((path) => `<a href="#${path}" data-path="${path}">${icon(routes[path].icon)}<span>${routes[path].label}</span></a>`).join('')}
          </nav>
          <button class="admin-sidebar__logout" id="logout-btn">${icon('settings')} خروج</button>
        </aside>
        <main class="admin-main" id="admin-content"></main>
      </div>
      <nav class="admin-tabbar" id="admin-tabbar">
        ${tabbarOrder.map((path) => `<a href="#${path}" data-path="${path}">${icon(routes[path].icon)}<span>${routes[path].label}</span></a>`).join('')}
        <button id="more-btn">${icon('more')}<span>بیشتر</span></button>
      </nav>
      <div class="more-sheet" id="more-sheet">
        <div class="more-sheet__backdrop"></div>
        <div class="more-sheet__panel">
          ${moreItems.map((path) => `<a href="#${path}" data-path="${path}">${routes[path].label}</a>`).join('')}
          <a href="#" id="logout-btn-mobile">خروج</a>
        </div>
      </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => window.Auth.logout());
    document.getElementById('logout-btn-mobile').addEventListener('click', (e) => { e.preventDefault(); window.Auth.logout(); });

    const moreBtn = document.getElementById('more-btn');
    const moreSheet = document.getElementById('more-sheet');
    moreBtn.addEventListener('click', () => moreSheet.classList.add('open'));
    moreSheet.querySelector('.more-sheet__backdrop').addEventListener('click', () => moreSheet.classList.remove('open'));
    moreSheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => moreSheet.classList.remove('open')));
  }

  function updateActiveNav(path) {
    document.querySelectorAll('.admin-nav a, .admin-tabbar a').forEach((a) => {
      a.classList.toggle('active', a.dataset.path === path || (path === '' && a.dataset.path === '/dashboard'));
    });
  }

  async function router() {
    const path = currentPath();
    const route = routes[path] || routes['/dashboard'];
    updateActiveNav(path);
    const content = document.getElementById('admin-content');
    if (content && route.module) {
      await route.module.render(content);
    }
  }

  function renderLogin() {
    appRoot.innerHTML = `
      <div class="login-screen">
        <div class="card login-card">
          <div class="logo"><img src="../img/logo.jpg" alt="دلسانا شاپ"></div>
          <div class="subtitle">ورود به پنل مدیریت</div>
          <div class="login-error" id="login-error"></div>
          <form id="login-form">
            <div class="field"><label>ایمیل</label><input class="input" type="email" name="email" required autocomplete="username"></div>
            <div class="field"><label>رمز عبور</label><input class="input" type="password" name="password" required autocomplete="current-password"></div>
            <button type="submit" class="btn btn-primary" style="width:100%;">ورود</button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const errEl = document.getElementById('login-error');
      const btn = e.target.querySelector('button');
      errEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'در حال ورود...';
      try {
        await window.Auth.login(fd.get('email'), fd.get('password'));
        window.location.hash = '#/dashboard';
        init();
      } catch (err) {
        errEl.textContent = 'ایمیل یا رمز عبور نادرست است.';
        btn.disabled = false;
        btn.textContent = 'ورود';
      }
    });
  }

  async function init() {
    const session = await window.Auth.getSession();
    if (!session) {
      renderLogin();
      return;
    }
    renderShell();
    await router();
  }

  window.addEventListener('hashchange', () => {
    if (currentPath() === '' && window.location.hash === '#/login') return;
    if (document.querySelector('.admin-shell')) router();
    else init();
  });

  init();
})();
