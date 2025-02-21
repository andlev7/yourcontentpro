/*
  # Fix Project Policies - Final Version

  1. Changes
    - Remove nested EXISTS clauses
    - Simplify policy logic
    - Use direct role and ownership checks

  2. Security
    - Maintain role-based access control
    - Preserve owner privileges
    - Keep project user assignments
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "projects_read_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
DROP POLICY IF EXISTS "allow_select_projects" ON projects;
DROP POLICY IF EXISTS "allow_insert_projects" ON projects;
DROP POLICY IF EXISTS "allow_update_projects" ON projects;
DROP POLICY IF EXISTS "allow_delete_projects" ON projects;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "project_select" ON projects
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project_users
    WHERE project_users.project_id = id
    AND project_users.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "project_insert" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'optimizer')
  )
);

CREATE POLICY "project_update" ON projects
FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "project_delete" ON projects
FOR DELETE TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);