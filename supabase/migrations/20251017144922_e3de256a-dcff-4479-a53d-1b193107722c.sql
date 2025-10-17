-- Add access_code column to weddings table
ALTER TABLE weddings ADD COLUMN access_code TEXT UNIQUE;

-- Generate codes for existing weddings
UPDATE weddings 
SET access_code = 'WED-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 4))
WHERE access_code IS NULL;

-- Trigger to auto-generate access code for new weddings
CREATE OR REPLACE FUNCTION generate_wedding_access_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_code IS NULL THEN
    NEW.access_code = 'WED-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 4));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_wedding_access_code
BEFORE INSERT ON weddings
FOR EACH ROW
EXECUTE FUNCTION generate_wedding_access_code();

-- Drop old policies that depend on token
DROP POLICY IF EXISTS "Anyone can view invitations with valid token" ON wedding_invitations;

-- Simplify wedding_invitations table (remove token system, keep for tracking only)
ALTER TABLE wedding_invitations DROP COLUMN IF EXISTS token CASCADE;
ALTER TABLE wedding_invitations DROP COLUMN IF EXISTS expires_at CASCADE;

-- Add new simplified RLS policy
CREATE POLICY "Users can view invitations sent to their email"
ON wedding_invitations
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  OR has_wedding_role(auth.uid(), wedding_id, 'co_planner')
);