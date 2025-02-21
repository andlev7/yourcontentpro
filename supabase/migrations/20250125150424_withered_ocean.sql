-- First, drop all existing project policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "project_select" ON projects;
  DROP POLICY IF EXISTS "project_insert" ON projects;
  DROP POLICY IF EXISTS "project_update" ON projects;
  DROP POLICY IF EXISTS "project_delete" ON projects;
END $$;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create simplified policies that avoid recursion
CREATE POLICY "project_select" ON projects
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project_users
    WHERE project_users.project_id = projects.id
    AND project_users.user_id = auth.uid()
  )
  OR (
    SELECT role FROM profiles 
    WHERE profiles.id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "project_insert" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  AND (
    SELECT role FROM profiles 
    WHERE profiles.id = auth.uid()
  ) IN ('admin', 'optimizer')
);

CREATE POLICY "project_update" ON projects
FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid()
  OR (
    SELECT role FROM profiles 
    WHERE profiles.id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "project_delete" ON projects
FOR DELETE TO authenticated
USING (
  owner_id = auth.uid()
  OR (
    SELECT role FROM profiles 
    WHERE profiles.id = auth.uid()
  ) = 'admin'
);