/*
  # Fix Project Policies

  1. Changes
    - Remove recursive policies that were causing infinite recursion
    - Simplify policy conditions for better performance
    - Add proper role-based checks

  2. Security
    - Enable RLS
    - Add policies for CRUD operations based on user role and ownership
*/

-- First, drop existing policies to start fresh
DROP POLICY IF EXISTS "projects_read_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "projects_read_policy" ON projects
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid() OR -- Owner can read
  EXISTS ( -- Assigned users can read
    SELECT 1 FROM project_users
    WHERE project_id = id
    AND user_id = auth.uid()
  ) OR
  EXISTS ( -- Admin can read all
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "projects_insert_policy" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id AND -- Only allow setting self as owner
  EXISTS ( -- Only admin and optimizer can create
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'optimizer')
  )
);

CREATE POLICY "projects_update_policy" ON projects
FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid() OR -- Owner can update
  EXISTS ( -- Admin can update all
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "projects_delete_policy" ON projects
FOR DELETE TO authenticated
USING (
  owner_id = auth.uid() OR -- Owner can delete
  EXISTS ( -- Admin can delete all
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);