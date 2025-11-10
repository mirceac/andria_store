-- Migration: Add hidden field to categories table
-- This allows categories to be hidden from the gallery view

-- Add hidden field to categories
ALTER TABLE categories 
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_hidden ON categories(hidden);

-- Set existing categories as not hidden
UPDATE categories SET hidden = false WHERE hidden IS NULL;

COMMENT ON COLUMN categories.hidden IS 'true = hidden from gallery view, false = visible';
