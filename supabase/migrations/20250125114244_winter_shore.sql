/*
  # Create profiles and roles tables

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique) - role name (admin, optimizer, client)
      - `created_at` (timestamp)
    
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role_id` (uuid, references roles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default roles
INSERT INTO roles (name) VALUES
  ('admin'),
  ('optimizer'),
  ('client')
ON CONFLICT (name) DO NOTHING;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role_id uuid REFERENCES roles NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for roles table
CREATE POLICY "Roles are viewable by authenticated users" ON roles
  FOR SELECT TO authenticated
  USING (true);

-- Policies for profiles table
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    (SELECT id FROM roles WHERE name = 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();