-- 📧 Simple Email API Providers Migration
-- Creates the basic API providers table first

BEGIN;

-- Drop table if exists to start fresh
DROP TABLE IF EXISTS email_api_providers CASCADE;
DROP TABLE IF EXISTS email_api_health_checks CASCADE;

-- Create API providers table
CREATE TABLE email_api_providers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,
    provider_type varchar(20) NOT NULL CHECK (provider_type IN ('resend', 'brevo', 'mailjet')),
    api_key_encrypted text NOT NULL,
    api_secret_encrypted text NULL,
    base_url varchar(500) DEFAULT NULL,
    
    -- Rotation & Load Balancing
    weight int DEFAULT 1 CHECK (weight > 0),
    priority int DEFAULT 100,
    daily_limit int DEFAULT 10000 CHECK (daily_limit > 0),
    hourly_limit int DEFAULT 1000 CHECK (hourly_limit > 0),
    
    -- Health & Status
    is_active boolean DEFAULT true,
    is_healthy boolean DEFAULT true,
    last_used_at timestamptz,
    last_health_check_at timestamptz DEFAULT now(),
    consecutive_failures int DEFAULT 0,
    total_success_count int DEFAULT 0,
    total_failure_count int DEFAULT 0,
    cooldown_until timestamptz,
    
    -- Rate Limiting
    today_sent_count int DEFAULT 0,
    current_hour_sent int DEFAULT 0,
    daily_reset_at date DEFAULT CURRENT_DATE,
    hourly_reset_at timestamptz DEFAULT date_trunc('hour', now()),
    
    -- Performance
    avg_response_time_ms int DEFAULT 0,
    last_error_message text,
    last_error_at timestamptz,
    
    -- Configuration
    provider_config jsonb DEFAULT '{}',
    tags jsonb DEFAULT '[]',
    metadata jsonb DEFAULT '{}',
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create health checks table
CREATE TABLE email_api_health_checks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    api_provider_id uuid NOT NULL REFERENCES email_api_providers(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'timeout', 'connection_error', 'auth_error')),
    response_time_ms int DEFAULT 0,
    error_message text,
    error_code varchar(50),
    test_endpoint varchar(500),
    http_status_code int,
    checked_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_api_providers_active_healthy ON email_api_providers (is_active, is_healthy);
CREATE INDEX idx_api_providers_priority ON email_api_providers (priority) WHERE is_active = true;
CREATE INDEX idx_api_providers_weight ON email_api_providers (weight) WHERE is_active = true AND is_healthy = true;
CREATE INDEX idx_api_providers_type ON email_api_providers (provider_type);
CREATE INDEX idx_api_providers_daily_usage ON email_api_providers (daily_reset_at, today_sent_count);
CREATE INDEX idx_api_providers_last_used ON email_api_providers (last_used_at);
CREATE INDEX idx_api_providers_tags ON email_api_providers USING gin (tags);

CREATE INDEX idx_api_health_checks_provider_status ON email_api_health_checks (api_provider_id, status);
CREATE INDEX idx_api_health_checks_checked_at ON email_api_health_checks (checked_at);

-- Add trigger for updated_at
CREATE TRIGGER trg_set_updated_at_email_api_providers
    BEFORE UPDATE ON email_api_providers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add utility functions
CREATE OR REPLACE FUNCTION reset_api_provider_daily_counters()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE email_api_providers 
    SET 
        today_sent_count = 0,
        daily_reset_at = CURRENT_DATE
    WHERE daily_reset_at < CURRENT_DATE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Reset daily counters for % API providers', updated_count;
    END IF;
END;
$$;

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

-- Insert sample data for testing
INSERT INTO email_api_providers (name, provider_type, api_key_encrypted, weight, priority, daily_limit, hourly_limit, tags) VALUES
('Resend Primary', 'resend', 'placeholder_encrypted_key_1', 3, 10, 5000, 500, '["primary", "transactional"]'::jsonb),
('Brevo Marketing', 'brevo', 'placeholder_encrypted_key_2', 2, 20, 10000, 800, '["marketing", "bulk"]'::jsonb),
('Mailjet Backup', 'mailjet', 'placeholder_encrypted_key_3', 1, 30, 3000, 300, '["backup", "fallback"]'::jsonb);

COMMIT;

-- Verify results
DO $$
DECLARE
    provider_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO provider_count FROM email_api_providers;
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'EMAIL API PROVIDERS TABLE CREATED';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Providers created: %', provider_count;
    RAISE NOTICE '==========================================';
END
$$;