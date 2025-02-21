-- Add content analysis columns to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS content_analysis jsonb DEFAULT '{
  "our_domain": {
    "headers": {
      "h1": [],
      "h2": [],
      "h3": [],
      "h4": []
    },
    "word_count": 0,
    "paragraphs": [],
    "lists": []
  },
  "competitors": []
}'::jsonb;

-- Create index for content analysis
CREATE INDEX IF NOT EXISTS idx_analyses_content ON analyses USING gin(content_analysis);

-- Add computed columns for averages
CREATE OR REPLACE FUNCTION get_avg_competitor_words(content_analysis jsonb)
RETURNS numeric AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG((comp->>'word_count')::numeric), 0)
    FROM jsonb_array_elements(content_analysis->'competitors') comp
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_max_competitor_words(content_analysis jsonb)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COALESCE(MAX((comp->>'word_count')::integer), 0)
    FROM jsonb_array_elements(content_analysis->'competitors') comp
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;