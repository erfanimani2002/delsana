# دلسانا شاپ — Delsanashop Cosmetics Store

A complete storefront + admin panel built with vanilla HTML/CSS/JS and Supabase (Postgres, Auth, Storage). No build step, no framework — just static files you can deploy to Vercel/Netlify/GitHub Pages.

## 1. Set up Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste the entire contents of `supabase-schema.sql`, and run it.
   This creates all tables, triggers (stock auto-decrement/restore, invoice numbering), RLS policies, and the `product-images` storage bucket.
3. Go to **Authentication → Users → Add user** and create your admin login (email + password).
4. In **SQL Editor**, run (replace the UUID with the user you just created):
   ```sql
   insert into profiles (id, full_name, role)
   values ('PASTE-USER-UUID-HERE', 'Owner', 'owner');
   ```
5. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.

## 2. Configure the app

Open `js/config.js` and paste your values:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
  ...
};
```

## 3. Run locally

Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open:
- `http://localhost:8080/index.html` — storefront
- `http://localhost:8080/admin/index.html` — admin panel (log in with the user you created)

## 4. Deploy

Push this folder to GitHub and import it into Vercel/Netlify as a static site — no build command needed (root = this folder).

## What's included

- **Storefront** (`index.html`): navbar with search, hero, quick links, horizontal category scroller, product grid with infinite scroll + sort/filter/search, product modal with Instagram DM / WhatsApp / SnapShop order links, editable content sections, footer.
- **Admin panel** (`admin/index.html`): Supabase-Auth login, responsive sidebar (desktop) / bottom tab bar (mobile), dashboard with today's revenue/invoices, stock totals, low-stock alerts, revenue-by-brand chart, and recent invoices; full CRUD for Products (with image upload + auto/manual page-price calculation), Invoices (line items, auto invoice numbering, stock-aware save), Brands, Categories; Reports (financial + general, date-range filtered); Settings (pricing coefficients, links, editable page content).
- **Database**: full schema, triggers for stock management and invoice numbering, and RLS policies (public read of active catalog data, authenticated-only writes).

## Notes & things worth double-checking before going live

- **Financial report profit split**: the schema doesn't record which price tier (shop vs. page) each invoice line was actually sold at per-item — only the invoice-level `sale_method`. The current "سود پیج/سود مغازه" split in Reports is a simplification. If you want a fully accurate split, consider adding a `sale_price_type` column to `invoice_items`.
- **Storage**: images upload to the public `product-images` bucket; deleting a product does not delete its uploaded image file (safe default, but you may want a cleanup job later).
- **RLS**: any authenticated user has full write access (single-tier admin/owner). If you need to restrict "admin" vs "owner" permissions, extend the RLS policies to check `profiles.role`.
