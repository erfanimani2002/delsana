window.Categories = (function () {
  let categories = [];

  async function load() {
    const { data, error } = await window.sb
      .from('categories')
      .select('id, name, image_url')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }
    categories = data || [];
    return categories;
  }

  function renderScroll(container, onSelect) {
    if (!categories.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = '';
    categories.forEach((c) => {
      const card = UI.el(`
        <button class="category-card" data-cat="${c.id}">
          <img class="category-card__img" src="${c.image_url || 'https://placehold.co/150x150/F6EAD4/818263?text=%D8%AF%D8%B3%D8%AA%D9%87'}" alt="${UI.escapeHtml(c.name)}">
          <span class="category-card__name">${UI.escapeHtml(c.name)}</span>
        </button>
      `);
      card.addEventListener('click', () => onSelect(c.id, card));
      container.appendChild(card);
    });
  }

  function renderChips(container, onSelect) {
    container.innerHTML = '';
    const allChip = UI.el(`<button class="chip active" data-cat="">همه</button>`);
    allChip.addEventListener('click', () => onSelect('', allChip));
    container.appendChild(allChip);

    categories.forEach((c) => {
      const chip = UI.el(`<button class="chip" data-cat="${c.id}">${UI.escapeHtml(c.name)}</button>`);
      chip.addEventListener('click', () => onSelect(c.id, chip));
      container.appendChild(chip);
    });
  }

  function getAll() {
    return categories;
  }

  return { load, renderScroll, renderChips, getAll };
})();
