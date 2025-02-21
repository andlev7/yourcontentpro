/*
  # Add role descriptions and update policies

  1. Changes
    - Add description column to roles table
    - Update existing roles with descriptions
    - Add policies for role-based access control
    
  2. Security
    - Update RLS policies to enforce role-based access
    - Add policies for different user roles
*/

-- Add description column to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description text;

-- Update role descriptions
UPDATE roles SET description = 'Full access to all system functions. Can manage users, projects, and analytics.' WHERE name = 'admin';
UPDATE roles SET description = 'Access to assigned projects. Can create and manage own projects and analyses.' WHERE name = 'optimizer';
UPDATE roles SET description = 'Access to assigned projects. Can edit texts and check uniqueness.' WHERE name = 'client';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create policies for role-based access
CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
    AND r.name = 'admin'
  )
);

CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
    AND r.name = 'admin'
  )
);

-- Add function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
    AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;