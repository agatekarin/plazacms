-- 📧 Create Email Usage Logs Table
-- Comprehensive logging for both SMTP and API email usage

BEGIN;

-- Create email_usage_logs table for tracking all email sends
CREATE TABLE IF NOT EXISTS email_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Provider Information
    account_id uuid NOT NULL, -- References smtp_accounts.id OR email_api_providers.id
    provider_type VARCHAR(10) NOT NULL CHECK (provider_type IN ('smtp', 'api')),
    provider_name VARCHAR(255) NOT NULL,
    
    -- API-specific fields (NULL for SMTP)
    api_provider_id uuid NULL REFERENCES email_api_providers(id),
    
    -- Email Details
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'rate_limited', 'bounced')),
    
    -- Response Details
    message_id VARCHAR(255) NULL, -- External message ID from provider
    response_time_ms INTEGER DEFAULT 0,
    error_code VARCHAR(50) NULL,
    error_message TEXT NULL,
    
    -- Rotation Details
    rotation_strategy VARCHAR(20) NOT NULL,
    was_fallback BOOLEAN DEFAULT false,
    attempt_number INTEGER DEFAULT 1 CHECK (attempt_number > 0),
    
    -- Performance Tracking
    queue_time_ms INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    
    -- Metadata
    user_agent TEXT NULL,
    client_ip INET NULL,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    delivered_at TIMESTAMP WITH TIME ZONE NULL,
    bounced_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_usage_logs_provider 
ON email_usage_logs(provider_type, provider_name);

CREATE INDEX IF NOT EXISTS idx_email_usage_logs_api_provider 
ON email_usage_logs(api_provider_id) 
WHERE api_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_usage_logs_status 
ON email_usage_logs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_email_usage_logs_recipient 
ON email_usage_logs(recipient_email, created_at);

CREATE INDEX IF NOT EXISTS idx_email_usage_logs_created_at 
ON email_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_usage_logs_performance 
ON email_usage_logs(response_time_ms, created_at) 
WHERE status = 'success';

-- Create index for rotation analysis
CREATE INDEX IF NOT EXISTS idx_email_usage_logs_rotation 
ON email_usage_logs(rotation_strategy, was_fallback, created_at);

-- Add some sample data for testing (optional)
-- This will help verify the table structure works correctly
INSERT INTO email_usage_logs (
    account_id,
    provider_type,
    provider_name,
    recipient_email,
    subject,
    status,
    message_id,
    response_time_ms,
    rotation_strategy,
    was_fallback,
    attempt_number,
    tags,
    metadata
) VALUES 
(
    gen_random_uuid(),
    'smtp',
    'System Test SMTP',
    'test@example.com',
    'System Integration Test Email',
    'success',
    'test_message_' || extract(epoch from now()),
    250,
    'round_robin',
    false,
    1,
    '["test", "integration"]',
    '{"test": true, "source": "migration"}'
) ON CONFLICT DO NOTHING;

COMMIT;

-- ✅ Email Usage Logs table created successfully
-- Ready for comprehensive logging of all email activities