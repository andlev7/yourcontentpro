-- First, drop all existing project policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "project_select" ON projects;
  DROP POLICY IF EXISTS "project_insert" ON projects;
  DROP POLICY IF EXISTS "project_update" ON projects;
  DROP POLICY IF EXISTS "project_delete" ON projects;
  DROP POLICY IF EXISTS "project_users_select" ON project_users;
  DROP POLICY IF EXISTS "project_users_insert" ON project_users;
  DROP POLICY IF EXISTS "project_users_delete" ON project_users;
END $$;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Create simplified project policies
CREATE POLICY "project_select" ON projects
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "project_insert" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id
);

CREATE POLICY "project_update" ON projects
FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "project_delete" ON projects
FOR DELETE TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Create project_users policies
CREATE POLICY "project_users_select" ON project_users
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "project_users_insert" ON project_users
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "project_users_delete" ON project_users
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);