-- Migration: Add user ownership to products and categories
-- This allows users to have their own products and categories separate from admin public ones

-- Add user_id and is_public to categories
ALTER TABLE categories 
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Remove unique constraint on category name to allow different users to have same category names
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add user_id and is_public to products  
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_is_public ON products(is_public);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_public ON categories(is_public);

-- Set existing data as public (admin products and categories)
UPDATE products SET is_public = true, user_id = NULL WHERE user_id IS NULL;
UPDATE categories SET is_public = true, user_id = NULL WHERE user_id IS NULL;

COMMENT ON COLUMN products.user_id IS 'Owner of the product. NULL = admin public product';
COMMENT ON COLUMN products.is_public IS 'true = admin public product visible to all, false = user private product';
COMMENT ON COLUMN categories.user_id IS 'Owner of the category. NULL = admin public category';
COMMENT ON COLUMN categories.is_public IS 'true = admin public category visible to all, false = user private category';
