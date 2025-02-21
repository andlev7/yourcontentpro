-- Add API credentials columns to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS api_key text,
ADD COLUMN IF NOT EXISTS api_url text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analyses_api_key ON analyses(api_key);
CREATE INDEX IF NOT EXISTS idx_analyses_api_url ON analyses(api_url);