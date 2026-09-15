// ============================================================
// Delsanashop — Global config
// Fill these in with your own Supabase project values.
// Find them in: Supabase Dashboard > Project Settings > API
// ============================================================
window.APP_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',

  // Storage bucket for product/category/brand images
  IMAGE_BUCKET: 'product-images',

  // Pagination
  PRODUCTS_PAGE_SIZE: 12,   // storefront infinite-scroll batch
  ADMIN_PAGE_SIZE: 20,      // admin tables

  // Sale/shipping/status enums (kept here so JS + <select> stay in sync)
  SALE_METHODS: ['مغازه', 'پیج', 'پیج-اسنپ‌شاپ'],
  SHIPPING_METHODS: ['پیک', 'پست پیشتاز', 'تیپاکس'],
  INVOICE_STATUSES: [
    'در انتظار ارسال',
    'ارسال شده',
    'تحویل شده',
    'لغو شده',
    'مرجوع شده',
  ],
};
