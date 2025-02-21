/*
  # Add additional fields to analyses table
  
  1. New Columns
    - `additional_keywords` (text array) - Optional list of additional keywords to analyze
    - `url` (text) - Optional URL to compare with competitors
  
  2. Changes
    - Remove API credentials columns as they are no longer needed
    - Drop indexes for removed columns
*/

-- Remove API credentials columns and their indexes
DROP INDEX IF EXISTS idx_analyses_api_key;
DROP INDEX IF EXISTS idx_analyses_api_url;
ALTER TABLE analyses DROP COLUMN IF EXISTS api_key;
ALTER TABLE analyses DROP COLUMN IF EXISTS api_url;

-- Add new columns
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS additional_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS url text;

-- Create index for URL lookups
CREATE INDEX IF NOT EXISTS idx_analyses_url ON analyses(url);