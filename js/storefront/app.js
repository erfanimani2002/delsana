(async function () {
  const grid = document.getElementById('product-grid');
  const sentinel = document.getElementById('load-sentinel');
  const searchInput = document.getElementById('search-input');
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const sortSelect = document.getElementById('sort-select');
  const chipRow = document.getElementById('category-chips');
  const catScroll = document.getElementById('category-scroll');
  const emptyState = document.getElementById('empty-state');

  let settings = null;

  // ---------- Settings & content ----------
  async function loadSettings() {
    const { data, error } = await window.sb.from('settings').select('*').limit(1).single();
    if (error) { console.error(error); return; }
    settings = data;
    ProductModal.setSettings(settings);

    const igLinks = document.querySelectorAll('[data-instagram-link]');
    igLinks.forEach((a) => { if (settings.instagram_link) a.href = settings.instagram_link; });

    const locationEl = document.querySelector('[data-shop-address]');
    if (locationEl && settings.shop_address) locationEl.textContent = settings.shop_address;

    const footerAddr = document.querySelector('[data-footer-address]');
    if (footerAddr) footerAddr.textContent = settings.shop_address || '';

    const copyright = document.querySelector('[data-copyright]');
    if (copyright) copyright.textContent = settings.copyright_text || '';
  }

  async function loadContent() {
    const { data, error } = await window.sb
      .from('store_content')
      .select('section_key, title, body')
      .eq('is_active', true);
    if (error) { console.error(error); return; }
    (data || []).forEach((section) => {
      const titleEl = document.querySelector(`[data-content-title="${section.section_key}"]`);
      const bodyEl = document.querySelector(`[data-content-body="${section.section_key}"]`);
      if (titleEl && section.title) titleEl.textContent = section.title;
      if (bodyEl) bodyEl.textContent = section.body || '';
    });
  }

  // ---------- Product grid ----------
  function showSkeletons(n) {
    for (let i = 0; i < n; i++) grid.appendChild(UI.skeletonCard());
  }
  function clearSkeletons() {
    grid.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  }

  async function loadMore() {
    showSkeletons(4);
    const items = await Products.fetchNextPage();
    clearSkeletons();
    items.forEach((p) => {
      const card = UI.productCard(p);
      card.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-open-product]');
        ProductModal.open(btn ? btn.dataset.openProduct : p.id);
      });
      grid.appendChild(card);
    });
    emptyState.style.display = (grid.children.length === 0) ? 'block' : 'none';
    observeSentinel();
  }

  async function resetAndLoad() {
    grid.innerHTML = '';
    Products.resetPaging();
    await loadMore();
  }

  let io;
  function observeSentinel() {
    if (io) io.disconnect();
    if (!Products.state.hasMore) return;
    io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    io.observe(sentinel);
  }

  // ---------- Search / sort / filter wiring ----------
  let searchDebounce;
  function wireSearch(input) {
    input.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        Products.setSearch(input.value);
        if (input !== searchInput) searchInput.value = input.value;
        if (input !== mobileSearchInput && mobileSearchInput) mobileSearchInput.value = input.value;
        resetAndLoad();
      }, 350);
    });
  }
  wireSearch(searchInput);
  if (mobileSearchInput) wireSearch(mobileSearchInput);

  sortSelect.addEventListener('change', () => {
    const map = { cheap: 'cheapest', expensive: 'expensive', newest: 'newest' };
    Products.setSort(map[sortSelect.value] || 'newest');
    resetAndLoad();
  });

  function selectCategory(id, activeEl, group) {
    document.querySelectorAll(`${group} .active`).forEach((n) => n.classList.remove('active'));
    activeEl.classList.add('active');
    // sync the other UI (chip row vs scroll row)
    document.querySelectorAll('[data-cat]').forEach((n) => {
      if (n.dataset.cat === id) n.classList.add('active');
      else n.classList.remove('active');
    });
    Products.setCategory(id);
    resetAndLoad();
  }

  // ---------- Mobile search toggle ----------
  const mobileSearchBar = document.getElementById('mobile-search-bar');
  const searchToggleBtn = document.getElementById('mobile-search-toggle');
  if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', () => {
      mobileSearchBar.hidden = !mobileSearchBar.hidden;
      if (!mobileSearchBar.hidden) mobileSearchInput.focus();
    });
  }

  // ---------- Mobile nav menu ----------
  const menuBtn = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // ---------- Init ----------
  await Promise.all([loadSettings(), loadContent()]);
  const cats = await Categories.load();
  Categories.renderScroll(catScroll, (id, activeEl) => selectCategory(id, activeEl, '.category-scroll'));
  Categories.renderChips(chipRow, (id, activeEl) => selectCategory(id, activeEl, '.chip-row'));
  await resetAndLoad();
})();
