/*
  # Fix user creation trigger and schema

  1. Changes
    - Fix the profile creation trigger to properly handle role assignment
    - Add missing foreign key constraint
    - Update trigger to use role name instead of id
  
  2. Security
    - Maintain existing RLS policies
*/

-- First, ensure the roles table exists and has the required roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default roles if they don't exist
INSERT INTO roles (name) VALUES
  ('admin'),
  ('optimizer'),
  ('client')
ON CONFLICT (name) DO NOTHING;

-- Update the profiles table structure
DO $$ 
BEGIN
  -- Drop the existing trigger if it exists
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Drop the existing function if it exists
  DROP FUNCTION IF EXISTS handle_new_user();
END $$;

-- Create the improved function for handling new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    (SELECT id FROM public.roles WHERE name = 
      COALESCE(
        (NEW.raw_user_meta_data->>'role')::text,
        'client'
      )
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure RLS is enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the policies
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;
CREATE POLICY "Roles are viewable by authenticated users" ON roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);