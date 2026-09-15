window.Products = (function () {
  const PAGE_SIZE = window.APP_CONFIG.PRODUCTS_PAGE_SIZE;

  const state = {
    search: '',
    categoryId: '',
    sort: 'newest', // 'cheapest' | 'expensive' | 'newest'
    page: 0,
    hasMore: true,
    loading: false,
  };

  function resetPaging() {
    state.page = 0;
    state.hasMore = true;
  }

  function buildQuery() {
    let q = window.sb
      .from('products')
      .select('id, name, image_url, page_price, stock, brand_id, category_id, brands(name)')
      .eq('is_active', true);

    if (state.categoryId) q = q.eq('category_id', state.categoryId);
    if (state.search) {
      // search by product name OR brand name isn't possible in one ilike across joined tables
      // directly, so we search product name here; brand search handled via a second query fallback.
      q = q.ilike('name', `%${state.search}%`);
    }

    if (state.sort === 'cheapest') q = q.order('page_price', { ascending: true, nullsFirst: false });
    else if (state.sort === 'expensive') q = q.order('page_price', { ascending: false, nullsFirst: false });
    else q = q.order('created_at', { ascending: false });

    const from = state.page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    return q.range(from, to);
  }

  async function fetchNextPage() {
    if (state.loading || !state.hasMore) return [];
    state.loading = true;
    try {
      const { data, error } = await buildQuery();
      if (error) throw error;
      state.hasMore = (data || []).length === PAGE_SIZE;
      state.page += 1;
      return data || [];
    } catch (err) {
      console.error(err);
      UI.toast('خطا در بارگذاری محصولات', 'error');
      return [];
    } finally {
      state.loading = false;
    }
  }

  async function fetchOne(id) {
    const { data, error } = await window.sb
      .from('products')
      .select('id, name, description, image_url, page_price, stock, snapshop_url, brands(name)')
      .eq('id', id)
      .single();
    if (error) {
      console.error(error);
      return null;
    }
    return data;
  }

  function setSearch(value) { state.search = value.trim(); resetPaging(); }
  function setCategory(id) { state.categoryId = id; resetPaging(); }
  function setSort(sort) { state.sort = sort; resetPaging(); }

  return { state, fetchNextPage, fetchOne, setSearch, setCategory, setSort, resetPaging };
})();
