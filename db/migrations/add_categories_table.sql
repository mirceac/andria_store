-- Create categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial 'General' category
INSERT INTO categories (name, description) VALUES ('General', 'General category for miscellaneous products');

-- Add category_id column to products table
ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id);

-- Update existing products to use the 'General' category
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'General');

-- Drop the old category column
ALTER TABLE products DROP COLUMN category;