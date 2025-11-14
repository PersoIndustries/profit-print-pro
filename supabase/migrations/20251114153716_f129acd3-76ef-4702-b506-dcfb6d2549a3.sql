-- Add customer_phone column to orders table
ALTER TABLE orders 
ADD COLUMN customer_phone TEXT;