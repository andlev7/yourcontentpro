/*
  # Add role column to profiles table

  1. Changes
    - Add role column to profiles table
    - Set default role values
    - Update security policies

  2. Security
    - Enable RLS
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

-- Recreate policies
DROP POLICY IF EXISTS "allow_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_read_all" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_update_all" ON profiles;

-- Create new policies
CREATE POLICY "allow_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "allow_admin_read_all"
ON profiles FOR SELECT
TO authenticated
USING (
  role = 'admin'
);

CREATE POLICY "allow_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "allow_admin_update_all"
ON profiles FOR UPDATE
TO authenticated
USING (
  role = 'admin'
);