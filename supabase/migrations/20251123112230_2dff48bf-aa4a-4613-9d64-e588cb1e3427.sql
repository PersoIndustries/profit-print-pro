-- Add creator field to catalog_projects
ALTER TABLE catalog_projects ADD COLUMN IF NOT EXISTS creator TEXT;