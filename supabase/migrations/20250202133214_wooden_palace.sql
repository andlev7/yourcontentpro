-- Add editor_content column if it doesn't exist
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS editor_content text;

-- Create index for faster text search if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_analyses_editor_content 
ON analyses USING gin(to_tsvector('english', COALESCE(editor_content, '')));

-- Create function to get editor content
CREATE OR REPLACE FUNCTION get_editor_content(analysis_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT editor_content 
    FROM analyses 
    WHERE id = analysis_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;