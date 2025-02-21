-- Create api_services table
CREATE TABLE api_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('dataforseo', 'candycontent', 'openai')),
  api_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE api_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "api_services_select" ON api_services
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'optimizer')
  )
);

CREATE POLICY "api_services_insert" ON api_services
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "api_services_update" ON api_services
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "api_services_delete" ON api_services
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_service_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_api_services_updated_at
  BEFORE UPDATE ON api_services
  FOR EACH ROW
  EXECUTE FUNCTION update_api_service_updated_at();

-- Insert default DataForSEO service
INSERT INTO api_services (name, service_type, api_key, is_active)
VALUES (
  'DataForSEO',
  'dataforseo',
  'your_username:your_password',
  true
);