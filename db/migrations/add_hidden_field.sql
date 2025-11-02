-- Add hidden field to products table
-- This allows administrators to hide products from regular users

ALTER TABLE products 
ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Add a comment to explain the field
COMMENT ON COLUMN products.hidden IS 'When true, product is only visible to administrators';

-- Optional: Create an index on the hidden field for better query performance
CREATE INDEX idx_products_hidden ON products(hidden);