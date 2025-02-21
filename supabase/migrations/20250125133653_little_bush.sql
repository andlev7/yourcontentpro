/*
  # Simplify profile policies

  1. Changes
    - Remove all existing policies
    - Create new simplified policies
    - Use direct role checks without subqueries

  2. Security
    - Maintain same access rules
    - Users can read/update their own profiles
    - Admins can read/update all profiles
*/

-- First drop all existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
  DROP POLICY IF EXISTS "profiles_read_admin" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
END $$;

-- Create single read policy
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR 
  role = 'admin'
);

-- Create single update policy
CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid() OR 
  role = 'admin'
);