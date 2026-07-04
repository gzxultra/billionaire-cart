-- Billionaire Cart D1 Schema
-- Stores parsed products and purchase stats server-side

CREATE TABLE IF NOT EXISTS parsed_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  image_url TEXT,
  description TEXT,
  asset_class TEXT NOT NULL DEFAULT 'other',
  monthly_overhead REAL NOT NULL DEFAULT 0,
  original_price REAL,
  original_currency TEXT,
  source_domain TEXT,
  favicon TEXT,
  parse_source TEXT,
  parsed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  parse_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_parsed_products_parsed_at ON parsed_products(parsed_at DESC);
CREATE INDEX IF NOT EXISTS idx_parsed_products_asset_class ON parsed_products(asset_class);

CREATE TABLE IF NOT EXISTS purchase_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_url TEXT NOT NULL,
  billionaire_id TEXT NOT NULL,
  purchased_at INTEGER NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  FOREIGN KEY (product_url) REFERENCES parsed_products(url)
);

CREATE INDEX IF NOT EXISTS idx_purchase_stats_purchased_at ON purchase_stats(purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_stats_product_url ON purchase_stats(product_url);
