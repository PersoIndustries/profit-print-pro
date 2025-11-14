-- Add new fields to catalog_items table for customizable product information
ALTER TABLE catalog_items 
ADD COLUMN long_description TEXT,
ADD COLUMN technical_specs TEXT,
ADD COLUMN additional_notes TEXT;