-- Add image fields to products table
ALTER TABLE products
ADD COLUMN image_url VARCHAR,
ADD COLUMN image_file VARCHAR,
ADD COLUMN image_data bytea;

-- Create index for image lookups
CREATE INDEX idx_products_image ON products(id) WHERE image_data IS NOT NULL;