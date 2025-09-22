-- Add parent_id field to categories table for hierarchical categories
ALTER TABLE categories 
ADD COLUMN parent_id INTEGER REFERENCES categories(id);

-- Add index for better query performance on parent_id
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Add some sample hierarchical data (optional)
-- UPDATE categories SET parent_id = NULL WHERE id = 1; -- Electronics (root)
-- UPDATE categories SET parent_id = 1 WHERE name = 'Computers'; -- Computers under Electronics
-- UPDATE categories SET parent_id = 1 WHERE name = 'Mobile Phones'; -- Mobile under Electronics