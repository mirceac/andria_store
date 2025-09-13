-- Add product variant support
-- Add columns for physical variants
ALTER TABLE products 
ADD COLUMN has_physical_variant BOOLEAN DEFAULT FALSE,
ADD COLUMN physical_price DECIMAL(10, 2);

-- Add variant type to order items to track which variant was purchased
ALTER TABLE order_items 
ADD COLUMN variant_type TEXT DEFAULT 'digital';

-- Update existing products to have digital-only by default
UPDATE products SET has_physical_variant = FALSE;

-- Update existing order items to be digital variant
UPDATE order_items SET variant_type = 'digital';