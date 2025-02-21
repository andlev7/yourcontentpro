/*
  # Update RLS policies for user management
  
  1. Changes
    - Add policy for admins to create new users
    - Update existing policies to use email for role checks
    - Ensure proper cascade of permissions
  
  2. Security
    - Enable RLS on profiles table
    - Add policies for CRUD operations
    - Use email-based role checking for better reliability
*/

-- First, drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
  DROP POLICY IF EXISTS "allow_read_own_profile" ON profiles;
  DROP POLICY IF EXISTS "allow_admin_read_all" ON profiles;
  DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
  DROP POLICY IF EXISTS "allow_admin_update_all" ON profiles;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for all operations
CREATE POLICY "profiles_read_policy" ON profiles
FOR SELECT TO authenticated
USING (
  auth.email() = email OR 
  is_user_admin(auth.email())
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT TO authenticated
WITH CHECK (
  is_user_admin(auth.email())
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE TO authenticated
USING (
  auth.email() = email OR 
  is_user_admin(auth.email())
)
WITH CHECK (
  auth.email() = email OR 
  is_user_admin(auth.email())
);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE TO authenticated
USING (
  is_user_admin(auth.email())
);