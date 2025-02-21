/*
  # Fix analyses table schema
  
  1. Changes
    - Ensure additional_keywords and url columns exist
    - Add serp_results column if missing
    - Set proper defaults and constraints
  
  2. Indexes
    - Add index for URL lookups
*/

-- First ensure the columns exist with proper types
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS additional_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS url text,
ADD COLUMN IF NOT EXISTS serp_results jsonb DEFAULT '[]'::jsonb;

-- Make serp_results non-null
ALTER TABLE analyses
ALTER COLUMN serp_results SET NOT NULL;

-- Create index for URL lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_analyses_url ON analyses(url);

-- Update any existing null values
UPDATE analyses 
SET additional_keywords = '{}'::text[] 
WHERE additional_keywords IS NULL;

UPDATE analyses 
SET serp_results = '[]'::jsonb 
WHERE serp_results IS NULL;