/*
  # Add function to check user role

  1. New Functions
    - `get_user_role(email text)`: Returns the role of a user by their email
    - `is_user_admin(email text)`: Returns true if the user is an admin

  2. Usage
    - Call `SELECT get_user_role('user@example.com')` to get user's role
    - Call `SELECT is_user_admin('user@example.com')` to check if user is admin
*/

-- Function to get user role by email
CREATE OR REPLACE FUNCTION get_user_role(user_email text)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM profiles 
    WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;