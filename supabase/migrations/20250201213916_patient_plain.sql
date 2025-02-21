/*
  # Add keyword analysis caching

  1. New Columns
    - `keyword_analysis` - JSON column to store analysis results
    - `last_analysis_at` - Timestamp of last analysis
    
  2. Changes
    - Add columns to analyses table
    - Add index for faster lookups
*/

-- Add columns for keyword analysis caching
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS keyword_analysis jsonb DEFAULT '{
  "keywords": [],
  "metrics": {
    "avgWordCount": 0,
    "maxWordCount": 0,
    "avgKeywordDensity": 0
  },
  "lastUpdated": null
}'::jsonb,
ADD COLUMN IF NOT EXISTS last_analysis_at timestamptz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_analyses_last_analysis ON analyses(last_analysis_at);