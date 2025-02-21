/*
  # Project Management Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text)
      - `owner_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `project_users`
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references profiles)
      - `role` (text, either 'optimizer' or 'client')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for CRUD operations based on user roles
*/

-- Create projects table
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_users table for managing assignments
CREATE TABLE project_users (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('optimizer', 'client')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "projects_read_policy" ON projects
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid() OR -- Owner can read
  EXISTS ( -- Assigned users can read
    SELECT 1 FROM project_users
    WHERE project_id = projects.id
    AND user_id = auth.uid()
  ) OR
  is_user_admin(auth.email()) -- Admin can read all
);

CREATE POLICY "projects_insert_policy" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id AND -- Only allow setting self as owner
  (
    get_user_role(auth.email()) IN ('admin', 'optimizer') -- Only admin and optimizer can create
  )
);

CREATE POLICY "projects_update_policy" ON projects
FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid() OR -- Owner can update
  is_user_admin(auth.email()) -- Admin can update all
)
WITH CHECK (
  owner_id = auth.uid() OR -- Owner can update
  is_user_admin(auth.email()) -- Admin can update all
);

CREATE POLICY "projects_delete_policy" ON projects
FOR DELETE TO authenticated
USING (
  owner_id = auth.uid() OR -- Owner can delete
  is_user_admin(auth.email()) -- Admin can delete all
);

-- Project users policies
CREATE POLICY "project_users_read_policy" ON project_users
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR -- Can see own assignments
  EXISTS ( -- Project owner can see all assignments
    SELECT 1 FROM projects
    WHERE id = project_users.project_id
    AND owner_id = auth.uid()
  ) OR
  is_user_admin(auth.email()) -- Admin can see all
);

CREATE POLICY "project_users_insert_policy" ON project_users
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS ( -- Project owner can assign users
    SELECT 1 FROM projects
    WHERE id = project_users.project_id
    AND owner_id = auth.uid()
  ) OR
  is_user_admin(auth.email()) -- Admin can assign users
);

CREATE POLICY "project_users_delete_policy" ON project_users
FOR DELETE TO authenticated
USING (
  EXISTS ( -- Project owner can remove assignments
    SELECT 1 FROM projects
    WHERE id = project_users.project_id
    AND owner_id = auth.uid()
  ) OR
  is_user_admin(auth.email()) -- Admin can remove assignments
);

-- Function to update projects.updated_at
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();