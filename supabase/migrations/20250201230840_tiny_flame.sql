-- Create keyword cache table
CREATE TABLE keyword_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  results jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (analysis_id, content_hash)
);

-- Add index for faster lookups
CREATE INDEX idx_keyword_cache_lookup ON keyword_cache(analysis_id, content_hash);

-- Enable RLS
ALTER TABLE keyword_cache ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "keyword_cache_select" ON keyword_cache
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM analyses a
    WHERE a.id = keyword_cache.analysis_id
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = a.project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_users pu
          WHERE pu.project_id = p.id
          AND pu.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  )
);

CREATE POLICY "keyword_cache_insert" ON keyword_cache
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM analyses a
    WHERE a.id = analysis_id
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = a.project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  )
);

CREATE POLICY "keyword_cache_update" ON keyword_cache
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM analyses a
    WHERE a.id = analysis_id
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = a.project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_keyword_cache_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_keyword_cache_updated_at
  BEFORE UPDATE ON keyword_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_keyword_cache_updated_at();

-- Function to clean old cache entries
CREATE OR REPLACE FUNCTION clean_old_keyword_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM keyword_cache
  WHERE updated_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;