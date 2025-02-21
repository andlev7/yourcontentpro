/*
  # Fix database policies

  1. Changes
    - Drop all existing policies to ensure clean state
    - Create new policies with unique names
    - Keep existing table structure
    
  2. Security
    - Re-enable RLS
    - Add proper role-based access policies
*/

-- First, drop all existing policies
DO $$ 
BEGIN
  -- Drop all policies from profiles table
  DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
  DROP POLICY IF EXISTS "profiles_admin_read" ON profiles;
  DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
  DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
END $$;

-- Re-enable RLS to ensure it's active
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies with guaranteed unique names
CREATE POLICY "profiles_read_20250125" ON profiles
FOR SELECT TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR id = auth.uid()
);

CREATE POLICY "profiles_update_self_20250125" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_update_admin_20250125" ON profiles
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);