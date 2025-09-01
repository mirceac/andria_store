-- Database Schema and Sample Data

-- Drop existing tables in reverse order of dependencies
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    pdf_file VARCHAR,
    pdf_data bytea,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- Session Table (for Passport.js)
CREATE TABLE IF NOT EXISTS "session" (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Sample Data

-- Admin User (password: admin)
INSERT INTO users (username, password, is_admin) VALUES 
('admin', 'ef8b1da1d797450be6577b93cc51aadb07b754d52ca96cc96dbb7f5d0c05cc4c0c2a41eedec93bc0e4ec130d465750954e1866415fe0b1eccb6041b4ce85b2ab.3926a6e11f96c40b64b6e5ab3c981110', true);

-- Sample Products
INSERT INTO products (name, description, price, stock, pdf_file) VALUES
('Classic T-Shirt', 'Comfortable cotton t-shirt', 29.99, 100, 'path/to/classic_tshirt.pdf'),
('Designer Jeans', 'Premium denim jeans', 89.99, 50, 'path/to/designer_jeans.pdf'),
('Running Shoes', 'Lightweight performance shoes', 129.99, 30, 'path/to/running_shoes.pdf'),
('Leather Wallet', 'Genuine leather bifold wallet', 49.99, 75, 'path/to/leather_wallet.pdf'),
('Smart Watch', 'Fitness tracking smartwatch', 199.99, 25, 'path/to/smart_watch.pdf'),
('Sunglasses', 'UV protection sunglasses', 79.99, 60, 'path/to/sunglasses.pdf');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Keep the existing pdf_file column but make it nullable
ALTER TABLE products ALTER COLUMN pdf_file DROP NOT NULL;

-- Add new column for binary data
ALTER TABLE products ADD COLUMN pdf_data bytea;

-- Create index for pdf lookups
CREATE INDEX idx_products_pdf ON products(id) WHERE pdf_data IS NOT NULL;