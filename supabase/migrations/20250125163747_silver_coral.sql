-- Add serp_results column to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS serp_results jsonb;

-- Update existing analyses to have empty array if null
UPDATE analyses 
SET serp_results = '[]'::jsonb 
WHERE serp_results IS NULL;

-- Make serp_results non-null with default empty array
ALTER TABLE analyses
ALTER COLUMN serp_results SET DEFAULT '[]'::jsonb,
ALTER COLUMN serp_results SET NOT NULL;