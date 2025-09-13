-- Add category column to products table
ALTER TABLE products ADD COLUMN category TEXT;

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);