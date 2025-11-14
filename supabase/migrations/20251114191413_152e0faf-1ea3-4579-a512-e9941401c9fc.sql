-- Add display_mode column to materials table
ALTER TABLE materials 
ADD COLUMN display_mode text DEFAULT 'color' CHECK (display_mode IN ('color', 'icon'));

-- Update existing materials to use color mode by default
UPDATE materials SET display_mode = 'color' WHERE display_mode IS NULL;