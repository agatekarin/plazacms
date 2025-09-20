-- ================================================================================
-- 📧 Add from_email field to email_api_providers table
-- ================================================================================
--
-- This migration adds a from_email field to the email_api_providers table
-- to store the verified sender email address for each provider.
--
-- ================================================================================

BEGIN;

-- Add from_email column to email_api_providers table
ALTER TABLE email_api_providers 
ADD COLUMN IF NOT EXISTS from_email varchar(255) DEFAULT NULL;

-- Add index for from_email for performance
CREATE INDEX IF NOT EXISTS idx_api_providers_from_email 
ON email_api_providers (from_email) 
WHERE from_email IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN email_api_providers.from_email IS 
'Verified sender email address for this provider. Must be verified with the provider to send emails successfully.';

COMMIT;