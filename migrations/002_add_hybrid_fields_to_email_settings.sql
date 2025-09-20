-- 📧 Add Hybrid Rotation Fields to email_settings Table
-- Extends email_settings to support hybrid rotation configuration

BEGIN;

-- Add hybrid rotation configuration columns to email_settings
ALTER TABLE email_settings 
ADD COLUMN IF NOT EXISTS hybrid_rotation_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_api_providers BOOLEAN DEFAULT false;

-- Update existing records to support hybrid rotation
UPDATE email_settings 
SET 
  hybrid_rotation_enabled = false,
  include_api_providers = false
WHERE hybrid_rotation_enabled IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_email_settings_hybrid_rotation 
ON email_settings(hybrid_rotation_enabled, include_api_providers) 
WHERE is_active = true;

COMMIT;

-- ✅ Migration completed successfully
-- Email settings table now supports hybrid rotation configuration