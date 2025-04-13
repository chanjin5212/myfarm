-- Create uuid-ossp extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create email_verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE
);

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- RLS policies
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Only service role can perform operations on this table
CREATE POLICY "Service role can manage email_verifications"
  ON email_verifications
  USING (true)
  WITH CHECK (true); 