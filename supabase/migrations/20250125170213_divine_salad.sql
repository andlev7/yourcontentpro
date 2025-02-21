/*
  # Add additional fields to analyses table
  
  1. Changes
    - Add additional_keywords and url columns
    - Set proper defaults and constraints
    - Add index for URL lookups
  
  2. Notes
    - Ensures backward compatibility
    - Preserves existing data
*/

-- First ensure the columns exist with proper types
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS additional_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS url text;

-- Create index for URL lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_analyses_url ON analyses(url);

-- Update any existing null values
UPDATE analyses 
SET additional_keywords = '{}'::text[] 
WHERE additional_keywords IS NULL;

-- Add check constraint for additional_keywords array with a unique name
ALTER TABLE analyses
ADD CONSTRAINT analyses_additional_keywords_not_null_20250125
CHECK (additional_keywords IS NOT NULL)
NOT VALID; -- NOT VALID allows existing data to remain unchanged

-- Validate the constraint after adding it
ALTER TABLE analyses
VALIDATE CONSTRAINT analyses_additional_keywords_not_null_20250125;