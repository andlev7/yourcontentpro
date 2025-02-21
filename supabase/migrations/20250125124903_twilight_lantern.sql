-- First, drop all existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "profiles_read_20250125" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_self_20250125" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_admin_20250125" ON profiles;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

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
  is_admin(auth.uid())
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
  is_admin(auth.uid())
);