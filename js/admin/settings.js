window.AdminSettings = (function () {
  async function render(container) {
    container.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div></div>`;

    const [{ data: settings }, { data: content }] = await Promise.all([
      window.sb.from('settings').select('*').limit(1).single(),
      window.sb.from('store_content').select('*'),
    ]);
    const contentMap = {};
    (content || []).forEach((c) => { contentMap[c.section_key] = c; });

    const sectionField = (key, label) => `
      <div class="field">
        <label>${label}</label>
        <textarea class="input" name="content_${key}">${AdminUI.escapeHtml((contentMap[key] && contentMap[key].body) || '')}</textarea>
      </div>
    `;

    container.innerHTML = `
      <div class="admin-header"><h1>تنظیمات</h1></div>
      <form id="settings-form" class="card panel">
        <h3>قیمت‌گذاری</h3>
        <div class="form-row">
          <div class="field"><label>ضریب قیمت پیج</label><input class="input" type="number" step="0.01" name="page_price_coefficient" value="${settings.page_price_coefficient}"></div>
          <div class="field"><label>واحد رند کردن (تومان)</label><input class="input" type="number" name="rounding_unit" value="${settings.rounding_unit}"></div>
        </div>

        <h3 style="margin-top:24px;">لینک‌ها</h3>
        <div class="form-row">
          <div class="field"><label>لینک واتساپ</label><input class="input" type="url" name="whatsapp_link" value="${AdminUI.escapeHtml(settings.whatsapp_link || '')}"></div>
          <div class="field"><label>لینک اینستاگرام</label><input class="input" type="url" name="instagram_link" value="${AdminUI.escapeHtml(settings.instagram_link || '')}"></div>
        </div>
        <div class="field"><label>آدرس فروشگاه</label><textarea class="input" name="shop_address">${AdminUI.escapeHtml(settings.shop_address || '')}</textarea></div>

        <h3 style="margin-top:24px;">محتوای صفحات</h3>
        ${sectionField('about_us', 'درباره ما')}
        ${sectionField('how_to_order', 'نحوه سفارش')}
        ${sectionField('packaging_types', 'انواع بسته‌بندی')}
        ${sectionField('sending_types', 'روش‌های ارسال')}

        <div class="field"><label>متن کپی‌رایت</label><input class="input" name="copyright_text" value="${AdminUI.escapeHtml(settings.copyright_text || '')}"></div>

        <button type="submit" class="btn btn-primary">ذخیره تنظیمات</button>
      </form>
    `;

    container.querySelector('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'در حال ذخیره...';
      try {
        const settingsPayload = {
          page_price_coefficient: Number(fd.get('page_price_coefficient')),
          rounding_unit: Number(fd.get('rounding_unit')),
          whatsapp_link: fd.get('whatsapp_link') || null,
          instagram_link: fd.get('instagram_link') || null,
          shop_address: fd.get('shop_address') || null,
          copyright_text: fd.get('copyright_text') || null,
        };
        const { error: sErr } = await window.sb.from('settings').update(settingsPayload).eq('id', settings.id);
        if (sErr) throw sErr;

        const keys = ['about_us', 'how_to_order', 'packaging_types', 'sending_types'];
        for (const key of keys) {
          const body = fd.get(`content_${key}`) || '';
          const { error } = await window.sb.from('store_content').update({ body }).eq('section_key', key);
          if (error) throw error;
        }

        AdminUI.toast('تنظیمات ذخیره شد', 'success');
      } catch (err) {
        AdminUI.toast('خطا: ' + err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ذخیره تنظیمات';
      }
    });
  }

  return { render };
})();
