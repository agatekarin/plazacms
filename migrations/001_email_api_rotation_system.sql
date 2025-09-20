-- ================================================================================
-- 📧 Email API Rotation System Migration
-- ================================================================================
-- 
-- Extends PlazaCMS email system to support API provider rotation alongside
-- existing SMTP rotation. Adds support for Resend, Brevo, Mailjet APIs
-- with intelligent load balancing and health monitoring.
--
-- Compatible with existing schema and maintains backward compatibility.
-- ================================================================================

BEGIN;

-- ================================================================================
-- 1. CREATE NEW TABLES
-- ================================================================================

-- 📧 Email API Providers Table
-- Stores configuration for API-based email providers (Resend, Brevo, Mailjet)
CREATE TABLE IF NOT EXISTS email_api_providers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,
    provider_type varchar(20) NOT NULL,
    api_key_encrypted text NOT NULL,
    api_secret_encrypted text NULL, -- For providers requiring API secret
    base_url varchar(500) DEFAULT NULL, -- Custom endpoints if needed
    
    -- Rotation & Load Balancing Configuration
    weight int DEFAULT 1 CHECK (weight > 0),
    priority int DEFAULT 100, -- 1=highest priority, 1000=lowest
    daily_limit int DEFAULT 10000,
    hourly_limit int DEFAULT 1000,
    
    -- Health & Status Tracking
    is_active boolean DEFAULT true,
    is_healthy boolean DEFAULT true,
    last_used_at timestamptz,
    last_health_check_at timestamptz DEFAULT now(),
    consecutive_failures int DEFAULT 0,
    total_success_count int DEFAULT 0,
    total_failure_count int DEFAULT 0,
    cooldown_until timestamptz,
    
    -- Rate Limiting Counters
    today_sent_count int DEFAULT 0,
    current_hour_sent int DEFAULT 0,
    daily_reset_at date DEFAULT CURRENT_DATE,
    hourly_reset_at timestamptz DEFAULT date_trunc('hour', now()),
    
    -- Performance & Error Tracking
    avg_response_time_ms int DEFAULT 0,
    last_error_message text,
    last_error_at timestamptz,
    
    -- Provider-Specific Configuration & Metadata
    provider_config jsonb DEFAULT '{}', -- Provider-specific settings
    tags jsonb DEFAULT '[]', -- Classification tags
    metadata jsonb DEFAULT '{}', -- Additional metadata
    
    -- Standard Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT email_api_providers_type_check 
        CHECK (provider_type IN ('resend', 'brevo', 'mailjet')),
    CONSTRAINT email_api_providers_daily_limit_check 
        CHECK (daily_limit > 0),
    CONSTRAINT email_api_providers_hourly_limit_check 
        CHECK (hourly_limit > 0),
    CONSTRAINT email_api_providers_weight_check 
        CHECK (weight > 0)
);

-- Performance Indexes for API Providers
CREATE INDEX idx_api_providers_active_healthy 
    ON email_api_providers (is_active, is_healthy);
    
CREATE INDEX idx_api_providers_priority 
    ON email_api_providers (priority) 
    WHERE is_active = true;
    
CREATE INDEX idx_api_providers_weight 
    ON email_api_providers (weight) 
    WHERE is_active = true AND is_healthy = true;
    
CREATE INDEX idx_api_providers_type 
    ON email_api_providers (provider_type);
    
CREATE INDEX idx_api_providers_daily_usage 
    ON email_api_providers (daily_reset_at, today_sent_count);
    
CREATE INDEX idx_api_providers_last_used 
    ON email_api_providers (last_used_at);
    
CREATE INDEX idx_api_providers_tags 
    ON email_api_providers USING gin (tags);

-- Comments for API Providers Table
COMMENT ON TABLE email_api_providers IS 
    'API-based email providers (Resend, Brevo, Mailjet) for load balancing rotation';
COMMENT ON COLUMN email_api_providers.weight IS 
    'Weight for weighted load balancing (higher = more emails)';
COMMENT ON COLUMN email_api_providers.priority IS 
    'Priority level (1=highest, 1000=lowest)';
COMMENT ON COLUMN email_api_providers.consecutive_failures IS 
    'Count of consecutive failures for health monitoring';
COMMENT ON COLUMN email_api_providers.api_key_encrypted IS 
    'AES encrypted API key, decrypted by EmailService';
COMMENT ON COLUMN email_api_providers.api_secret_encrypted IS 
    'AES encrypted API secret for providers that require it';

-- 🏥 API Provider Health Checks Table
-- Tracks health check results for API providers
CREATE TABLE IF NOT EXISTS email_api_health_checks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    api_provider_id uuid NOT NULL 
        REFERENCES email_api_providers(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL,
    response_time_ms int DEFAULT 0,
    error_message text,
    error_code varchar(50),
    test_endpoint varchar(500), -- Which endpoint was tested
    http_status_code int, -- HTTP response code
    checked_at timestamptz DEFAULT now(),
    
    CONSTRAINT email_api_health_checks_status_check 
        CHECK (status IN ('healthy', 'unhealthy', 'timeout', 'connection_error', 'auth_error'))
);

-- Indexes for Health Checks
CREATE INDEX idx_api_health_checks_provider_status 
    ON email_api_health_checks (api_provider_id, status);
CREATE INDEX idx_api_health_checks_checked_at 
    ON email_api_health_checks (checked_at);

COMMENT ON TABLE email_api_health_checks IS 
    'Health monitoring results for email API providers';

-- ================================================================================
-- 2. EXTEND EXISTING TABLES
-- ================================================================================

-- 🔄 Rename smtp_rotation_config to email_rotation_config for generic use
-- Check if old table exists before renaming
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'smtp_rotation_config' 
               AND table_schema = 'public') THEN
        
        -- Rename table
        ALTER TABLE smtp_rotation_config RENAME TO email_rotation_config;
        
        -- Rename constraint
        ALTER TABLE email_rotation_config 
            DROP CONSTRAINT IF EXISTS smtp_rotation_config_strategy_check;
        
        -- Add new constraint with updated name
        ALTER TABLE email_rotation_config 
            ADD CONSTRAINT email_rotation_config_strategy_check 
            CHECK (strategy IN ('round_robin', 'weighted', 'priority', 'health_based', 'least_used'));
            
        -- Rename foreign key constraint
        ALTER TABLE email_rotation_config 
            DROP CONSTRAINT IF EXISTS fk_emergency_account;
        ALTER TABLE email_rotation_config 
            ADD CONSTRAINT fk_emergency_smtp_account 
            FOREIGN KEY (emergency_single_account_id) 
            REFERENCES smtp_accounts(id) ON DELETE SET NULL;
            
        RAISE NOTICE 'Renamed smtp_rotation_config to email_rotation_config';
    END IF;
    
    -- If email_rotation_config doesn't exist, create it (fresh install)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'email_rotation_config' 
                   AND table_schema = 'public') THEN
        
        CREATE TABLE email_rotation_config (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            enabled bool DEFAULT false,
            fallback_to_single bool DEFAULT true,
            strategy varchar(20) DEFAULT 'round_robin',
            max_retry_attempts int DEFAULT 3 CHECK (max_retry_attempts > 0),
            retry_delay_seconds int DEFAULT 30 CHECK (retry_delay_seconds > 0),
            failure_cooldown_minutes int DEFAULT 30,
            health_check_interval_minutes int DEFAULT 5,
            failure_threshold int DEFAULT 5,
            success_threshold int DEFAULT 3,
            global_daily_limit int,
            global_hourly_limit int,
            prefer_healthy_accounts bool DEFAULT true,
            balance_by_response_time bool DEFAULT false,
            avoid_consecutive_same_account bool DEFAULT true,
            emergency_fallback_enabled bool DEFAULT true,
            emergency_single_account_id uuid REFERENCES smtp_accounts(id) ON DELETE SET NULL,
            track_performance_metrics bool DEFAULT true,
            log_rotation_decisions bool DEFAULT false,
            settings jsonb DEFAULT '{}',
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            
            CONSTRAINT email_rotation_config_strategy_check 
                CHECK (strategy IN ('round_robin', 'weighted', 'priority', 'health_based', 'least_used'))
        );
        
        -- Create unique index for singleton pattern
        CREATE UNIQUE INDEX idx_email_rotation_config_singleton 
            ON email_rotation_config ((1));
            
        RAISE NOTICE 'Created email_rotation_config table';
    END IF;
END
$$;

-- Add new columns to email_rotation_config for API provider support
DO $$
BEGIN
    -- Add columns for hybrid rotation (API + SMTP)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_rotation_config' 
                   AND column_name = 'include_api_providers') THEN
        ALTER TABLE email_rotation_config ADD COLUMN include_api_providers boolean DEFAULT false;
        RAISE NOTICE 'Added include_api_providers column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_rotation_config' 
                   AND column_name = 'api_smtp_balance_ratio') THEN
        ALTER TABLE email_rotation_config ADD COLUMN api_smtp_balance_ratio numeric(3,2) DEFAULT 0.50 
            CHECK (api_smtp_balance_ratio BETWEEN 0 AND 1);
        RAISE NOTICE 'Added api_smtp_balance_ratio column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_rotation_config' 
                   AND column_name = 'prefer_api_over_smtp') THEN
        ALTER TABLE email_rotation_config ADD COLUMN prefer_api_over_smtp boolean DEFAULT true;
        RAISE NOTICE 'Added prefer_api_over_smtp column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_rotation_config' 
                   AND column_name = 'api_fallback_to_smtp') THEN
        ALTER TABLE email_rotation_config ADD COLUMN api_fallback_to_smtp boolean DEFAULT true;
        RAISE NOTICE 'Added api_fallback_to_smtp column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_rotation_config' 
                   AND column_name = 'smtp_fallback_to_api') THEN
        ALTER TABLE email_rotation_config ADD COLUMN smtp_fallback_to_api boolean DEFAULT true;
        RAISE NOTICE 'Added smtp_fallback_to_api column';
    END IF;
    
    -- Add emergency API provider fallback
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_rotation_config' 
                   AND column_name = 'emergency_api_provider_id') THEN
        ALTER TABLE email_rotation_config ADD COLUMN emergency_api_provider_id uuid 
            REFERENCES email_api_providers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added emergency_api_provider_id column';
    END IF;
END
$$;

-- Add comments for new columns
COMMENT ON COLUMN email_rotation_config.include_api_providers IS 
    'Whether to include API providers in rotation alongside SMTP';
COMMENT ON COLUMN email_rotation_config.api_smtp_balance_ratio IS 
    'Ratio for API vs SMTP usage (0.5 = 50% API, 50% SMTP)';
COMMENT ON COLUMN email_rotation_config.prefer_api_over_smtp IS 
    'Whether to prefer API providers over SMTP when both are available';
COMMENT ON COLUMN email_rotation_config.api_fallback_to_smtp IS 
    'Whether to fallback to SMTP when API providers fail';
COMMENT ON COLUMN email_rotation_config.smtp_fallback_to_api IS 
    'Whether to fallback to API when SMTP providers fail';

-- 📊 Extend smtp_usage_logs to support API providers
-- Check if table needs to be renamed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'smtp_usage_logs' 
               AND table_schema = 'public') THEN
        
        -- Rename table for generic use
        ALTER TABLE smtp_usage_logs RENAME TO email_usage_logs;
        RAISE NOTICE 'Renamed smtp_usage_logs to email_usage_logs';
    END IF;
    
    -- Create table if it doesn't exist (fresh install)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'email_usage_logs' 
                   AND table_schema = 'public') THEN
        
        CREATE TABLE email_usage_logs (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            smtp_account_id uuid REFERENCES smtp_accounts(id) ON DELETE CASCADE,
            email_notification_id uuid,
            recipient_email varchar(255) NOT NULL,
            subject text NOT NULL,
            status varchar(20) NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'rate_limited')),
            message_id varchar(500),
            response_time_ms int DEFAULT 0,
            error_code varchar(50),
            error_message text,
            rotation_strategy varchar(20) NOT NULL,
            was_fallback bool DEFAULT false,
            attempt_number int DEFAULT 1,
            queue_wait_time_ms int DEFAULT 0,
            total_processing_time_ms int DEFAULT 0,
            created_at timestamptz DEFAULT now()
        );
    END IF;
END
$$;

-- Add new columns to email_usage_logs for API provider support
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_usage_logs' 
                   AND column_name = 'provider_type') THEN
        ALTER TABLE email_usage_logs ADD COLUMN provider_type varchar(10) DEFAULT 'smtp' 
            CHECK (provider_type IN ('smtp', 'api'));
        RAISE NOTICE 'Added provider_type column to email_usage_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_usage_logs' 
                   AND column_name = 'api_provider_id') THEN
        ALTER TABLE email_usage_logs ADD COLUMN api_provider_id uuid 
            REFERENCES email_api_providers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added api_provider_id column to email_usage_logs';
    END IF;
    
    -- Rename smtp_account_id to account_id for generic use
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'email_usage_logs' 
               AND column_name = 'smtp_account_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'email_usage_logs' 
                       AND column_name = 'account_id') THEN
        ALTER TABLE email_usage_logs RENAME COLUMN smtp_account_id TO account_id;
        RAISE NOTICE 'Renamed smtp_account_id to account_id in email_usage_logs';
    END IF;
    
    -- Add provider_name for easier querying
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_usage_logs' 
                   AND column_name = 'provider_name') THEN
        ALTER TABLE email_usage_logs ADD COLUMN provider_name varchar(255);
        RAISE NOTICE 'Added provider_name column to email_usage_logs';
    END IF;
END
$$;

-- Create new indexes for extended usage logs
CREATE INDEX IF NOT EXISTS idx_email_usage_logs_provider_type 
    ON email_usage_logs (provider_type);
CREATE INDEX IF NOT EXISTS idx_email_usage_logs_api_provider 
    ON email_usage_logs (api_provider_id);
CREATE INDEX IF NOT EXISTS idx_email_usage_logs_provider_status 
    ON email_usage_logs (provider_type, status, created_at);

-- Update existing email_notifications table to support API providers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_notifications' 
                   AND column_name = 'api_provider_id') THEN
        ALTER TABLE email_notifications ADD COLUMN api_provider_id uuid 
            REFERENCES email_api_providers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added api_provider_id column to email_notifications';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_notifications' 
                   AND column_name = 'api_provider_name') THEN
        ALTER TABLE email_notifications ADD COLUMN api_provider_name varchar(255);
        RAISE NOTICE 'Added api_provider_name column to email_notifications';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_notifications' 
                   AND column_name = 'provider_type') THEN
        ALTER TABLE email_notifications ADD COLUMN provider_type varchar(10) DEFAULT 'smtp'
            CHECK (provider_type IN ('smtp', 'api', 'resend', 'brevo', 'mailjet'));
        RAISE NOTICE 'Added provider_type column to email_notifications';
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_email_notifications_api_provider 
    ON email_notifications (api_provider_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_provider_type 
    ON email_notifications (provider_type);

-- ================================================================================
-- 3. UTILITY FUNCTIONS
-- ================================================================================

-- 🔄 Reset API provider daily counters (similar to SMTP)
CREATE OR REPLACE FUNCTION reset_api_provider_daily_counters()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE email_api_providers 
    SET 
        today_sent_count = 0,
        daily_reset_at = CURRENT_DATE
    WHERE daily_reset_at < CURRENT_DATE;
    
    GET DIAGNOSTICS 
    $$;

-- 🔄 Reset API provider hourly counters
CREATE OR REPLACE FUNCTION reset_api_provider_hourly_counters()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE email_api_providers 
    SET 
        current_hour_sent = 0,
        hourly_reset_at = DATE_TRUNC('hour', NOW())
    WHERE hourly_reset_at < DATE_TRUNC('hour', NOW());
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Reset hourly counters for % API providers', updated_count;
    END IF;
END;
$$;

-- 🧹 Cleanup old API provider health checks (similar to SMTP)
CREATE OR REPLACE FUNCTION cleanup_api_provider_health_checks()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_api_health_checks 
    WHERE checked_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old API provider health check records', deleted_count;
END;
$$;

-- 🧹 Cleanup old email usage logs (extended from SMTP version)
CREATE OR REPLACE FUNCTION cleanup_email_usage_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_usage_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old email usage log records', deleted_count;
END;
$$;

-- ================================================================================
-- 4. TRIGGERS FOR AUTOMATIC UPDATES
-- ================================================================================

-- Trigger for updating updated_at timestamp on API providers
CREATE TRIGGER trg_set_updated_at_email_api_providers
    BEFORE UPDATE ON email_api_providers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================================
-- 5. INSERT DEFAULT CONFIGURATION
-- ================================================================================

-- Insert default email rotation config if none exists
INSERT INTO email_rotation_config (
    enabled,
    include_api_providers,
    api_smtp_balance_ratio,
    prefer_api_over_smtp,
    api_fallback_to_smtp,
    smtp_fallback_to_api,
    strategy,
    max_retry_attempts,
    retry_delay_seconds,
    failure_cooldown_minutes,
    health_check_interval_minutes,
    failure_threshold,
    success_threshold,
    prefer_healthy_accounts,
    balance_by_response_time,
    avoid_consecutive_same_account,
    emergency_fallback_enabled,
    track_performance_metrics,
    log_rotation_decisions,
    settings
) 
SELECT 
    false, -- disabled by default
    false, -- API providers disabled by default
    0.50,  -- 50% API, 50% SMTP balance
    true,  -- prefer API over SMTP
    true,  -- API can fallback to SMTP
    true,  -- SMTP can fallback to API
    'round_robin',
    3,
    30,
    30,
    5,
    5,
    3,
    true,
    false,
    true,
    true,
    true,
    false,
    '{"description": "Default hybrid email rotation configuration"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM email_rotation_config);

-- ================================================================================
-- 6. EXAMPLE DATA (COMMENTED OUT - UNCOMMENT FOR TESTING)
-- ================================================================================

/*
-- Example API provider configurations (for testing/demo)
-- IMPORTANT: These use placeholder encrypted keys - replace with real ones

INSERT INTO email_api_providers (
    name, provider_type, api_key_encrypted, weight, priority,
    daily_limit, hourly_limit, provider_config, tags
) VALUES 
(
    'Resend Primary',
    'resend',
    'encrypted_resend_api_key_here',
    3,
    10,
    5000,
    500,
    '{"domain": "example.com"}'::jsonb,
    '["primary", "transactional"]'::jsonb
),
(
    'Brevo Marketing',
    'brevo', 
    'encrypted_brevo_api_key_here',
    2,
    20,
    10000,
    800,
    '{"sender_name": "PlazaCMS", "sender_email": "noreply@example.com"}'::jsonb,
    '["marketing", "campaigns"]'::jsonb
),
(
    'Mailjet Backup',
    'mailjet',
    'encrypted_mailjet_public_key_here',
    1,
    30,
    3000,
    300,
    '{"sandbox": false}'::jsonb,
    '["backup", "fallback"]'::jsonb
);

-- Enable hybrid rotation in config
UPDATE email_rotation_config 
SET 
    enabled = true,
    include_api_providers = true,
    api_smtp_balance_ratio = 0.70, -- 70% API, 30% SMTP
    log_rotation_decisions = true
WHERE id = (SELECT id FROM email_rotation_config LIMIT 1);
*/

-- ================================================================================
-- 7. VERIFICATION AND CLEANUP
-- ================================================================================

-- Verify tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    api_provider_count INTEGER;
    config_count INTEGER;
BEGIN
    -- Count new tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN ('email_api_providers', 'email_api_health_checks', 'email_rotation_config', 'email_usage_logs')
    AND table_schema = 'public';
    
    -- Count API providers (should be 0 initially)
    SELECT COUNT(*) INTO api_provider_count FROM email_api_providers;
    
    -- Count rotation configs (should be 1)
    SELECT COUNT(*) INTO config_count FROM email_rotation_config;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'EMAIL API ROTATION SYSTEM MIGRATION COMPLETE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Tables created/updated: %', table_count;
    RAISE NOTICE 'API providers configured: %', api_provider_count;
    RAISE NOTICE 'Rotation configs: %', config_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure API providers via admin interface';
    RAISE NOTICE '2. Enable hybrid rotation in email settings';
    RAISE NOTICE '3. Monitor email_usage_logs for performance';
    RAISE NOTICE '==========================================';
END
$$;

COMMIT;

-- ================================================================================
-- END OF MIGRATION
-- ================================================================================