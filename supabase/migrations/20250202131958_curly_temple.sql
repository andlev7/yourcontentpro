-- Add editor_content column to analyses table
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS editor_content text;

-- Create index for faster text search
CREATE INDEX IF NOT EXISTS idx_analyses_editor_content ON analyses USING gin(to_tsvector('english', COALESCE(editor_content, '')));