-- ============================================================
-- Delsanashop Cosmetics Store — Supabase Schema
-- Run this whole file once in the Supabase SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin','owner')),
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_id uuid references brands(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  shop_price integer not null,
  page_price integer,
  page_price_manual boolean not null default false,
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  image_url text,
  description text,
  snapshop_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_categories (
  product_id uuid references products(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  customer_first_name text,
  customer_last_name text,
  customer_phone text,
  customer_address text,
  postal_code text,
  sale_method text not null check (sale_method in ('مغازه','پیج','پیج-اسنپ‌شاپ')),
  shipping_method text check (shipping_method in ('پیک','پست پیشتاز','تیپاکس')),
  status text not null default 'در انتظار ارسال'
    check (status in ('در انتظار ارسال','ارسال شده','تحویل شده','لغو شده','مرجوع شده')),
  total_price integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  page_price_coefficient numeric not null default 1.35,
  rounding_unit integer not null default 10000,
  whatsapp_link text,
  instagram_link text,
  shop_address text,
  about_us text,
  how_to_order text,
  packaging_types text,
  sending_types text,
  copyright_text text default '© Delsanashop'
);

create table if not exists store_content (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  title text,
  body text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Seed a single settings row if none exists
insert into settings (page_price_coefficient, rounding_unit)
select 1.35, 10000
where not exists (select 1 from settings);

-- Seed default content sections
insert into store_content (section_key, title, body)
select * from (values
  ('how_to_order', 'نحوه سفارش', ''),
  ('packaging_types', 'انواع بسته‌بندی', ''),
  ('sending_types', 'روش‌های ارسال', ''),
  ('about_us', 'درباره ما', '')
) as v(section_key, title, body)
where not exists (select 1 from store_content where store_content.section_key = v.section_key);

-- ------------------------------------------------------------
-- 2. TRIGGERS
-- ------------------------------------------------------------

-- Auto-decrement stock on invoice item insert
create or replace function decrement_stock()
returns trigger as $$
begin
  update products
  set stock = stock - new.quantity
  where id = new.product_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_invoice_item_insert on invoice_items;
create trigger on_invoice_item_insert
  after insert on invoice_items
  for each row
  execute function decrement_stock();

-- Restore stock if an invoice item is deleted (e.g. invoice edited/cancelled)
create or replace function restore_stock()
returns trigger as $$
begin
  update products
  set stock = stock + old.quantity
  where id = old.product_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_invoice_item_delete on invoice_items;
create trigger on_invoice_item_delete
  after delete on invoice_items
  for each row
  execute function restore_stock();

-- Keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

drop trigger if exists invoices_set_updated_at on invoices;
create trigger invoices_set_updated_at
  before update on invoices
  for each row execute function set_updated_at();

drop trigger if exists store_content_set_updated_at on store_content;
create trigger store_content_set_updated_at
  before update on store_content
  for each row execute function set_updated_at();

-- Auto-generate invoice_number if not supplied: YYYY-MM-DD-NNN
create or replace function generate_invoice_number()
returns trigger as $$
declare
  today_prefix text := to_char(now(), 'YYYY-MM-DD');
  next_seq int;
begin
  if new.invoice_number is null or new.invoice_number = '' then
    select coalesce(max(
      cast(split_part(invoice_number, '-', 4) as int)
    ), 0) + 1
    into next_seq
    from invoices
    where invoice_number like today_prefix || '-%';

    new.invoice_number := today_prefix || '-' || lpad(next_seq::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists invoices_set_number on invoices;
create trigger invoices_set_number
  before insert on invoices
  for each row execute function generate_invoice_number();

-- ------------------------------------------------------------
-- 3. INDEXES
-- ------------------------------------------------------------

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_brand on products(brand_id);
create index if not exists idx_products_active on products(is_active);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
create index if not exists idx_invoice_items_product on invoice_items(product_id);
create index if not exists idx_invoices_created on invoices(created_at desc);
create index if not exists idx_invoices_status on invoices(status);

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table profiles enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table product_categories enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table settings enable row level security;
alter table store_content enable row level security;

-- Public (storefront, anon key) can READ active catalog data only
create policy "public read active categories" on categories
  for select using (is_active = true);

create policy "public read active brands" on brands
  for select using (is_active = true);

create policy "public read active products" on products
  for select using (is_active = true);

create policy "public read product_categories" on product_categories
  for select using (true);

create policy "public read settings" on settings
  for select using (true);

create policy "public read active store_content" on store_content
  for select using (is_active = true);

-- Authenticated admins get full access everywhere
create policy "admins full access categories" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins full access brands" on brands
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins full access products" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins full access product_categories" on product_categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins full access invoices" on invoices
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins full access invoice_items" on invoice_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins full access settings" on settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins full access store_content" on store_content
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admins read own profile" on profiles
  for select using (auth.uid() = id);

create policy "admins update own profile" on profiles
  for update using (auth.uid() = id);

-- ------------------------------------------------------------
-- 5. STORAGE BUCKET
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "admins upload product-images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "admins update product-images"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "admins delete product-images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- ============================================================
-- Done. After running this:
-- 1. Create your first admin user in Authentication > Users
-- 2. Insert a matching row into profiles:
--    insert into profiles (id, full_name, role) values ('<auth-user-uuid>', 'Owner', 'owner');
-- ============================================================
