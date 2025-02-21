/*
  # Fix Project Policies Recursion

  1. Changes
    - Simplify policies to avoid recursion
    - Use direct role checks
    - Maintain security while improving performance

  2. Security
    - Enable RLS
    - Add policies for CRUD operations
    - Maintain role-based access control
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "projects_read_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "allow_select_projects" ON projects
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      -- Admin can see all projects
      profiles.role = 'admin'
      -- Owner can see their projects
      OR projects.owner_id = profiles.id
      -- Assigned users can see their projects
      OR EXISTS (
        SELECT 1 FROM project_users
        WHERE project_users.project_id = projects.id
        AND project_users.user_id = profiles.id
      )
    )
  )
);

CREATE POLICY "allow_insert_projects" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'optimizer')
  )
  AND auth.uid() = owner_id
);

CREATE POLICY "allow_update_projects" ON projects
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR projects.owner_id = profiles.id
    )
  )
);

CREATE POLICY "allow_delete_projects" ON projects
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR projects.owner_id = profiles.id
    )
  )
);