/*
  # Add user fields

  1. Changes
    - Add role column to profiles table
    - Add policies for role-based access
*/

-- Add role column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'client'
CHECK (role IN ('admin', 'optimizer', 'client'));

-- Update existing profiles to have default role
UPDATE profiles 
SET role = 'client' 
WHERE role IS NULL;

-- Recreate policies with role checks
DROP POLICY IF EXISTS "profiles_read_20250125" ON profiles;
DROP POLICY IF EXISTS "profiles_update_self_20250125" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin_20250125" ON profiles;

-- Create new policies
CREATE POLICY "profiles_read_own_20250125"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "profiles_read_admin_20250125"
ON profiles FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "profiles_update_own_20250125"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "profiles_update_admin_20250125"
ON profiles FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);