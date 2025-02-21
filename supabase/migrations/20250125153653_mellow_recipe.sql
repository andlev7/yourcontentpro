/*
  # Create analyses table and policies

  1. New Tables
    - `analyses`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `keyword` (text)
      - `quick_score` (numeric)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `analyses` table
    - Add policies for CRUD operations based on project access
*/

-- Create analyses table
CREATE TABLE analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  quick_score numeric,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "analyses_select" ON analyses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE id = analyses.project_id
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_users
        WHERE project_id = projects.id
        AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  )
);

CREATE POLICY "analyses_insert" ON analyses
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  )
);

CREATE POLICY "analyses_update" ON analyses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE id = analyses.project_id
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  )
);

CREATE POLICY "analyses_delete" ON analyses
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE id = analyses.project_id
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analysis_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_analysis_updated_at();