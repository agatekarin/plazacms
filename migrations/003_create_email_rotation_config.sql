-- 📧 Create Email Rotation Configuration Table
-- Central configuration for hybrid email rotation system

BEGIN;

-- Create email_rotation_config table for hybrid rotation settings
CREATE TABLE IF NOT EXISTS email_rotation_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Settings
    enabled BOOLEAN DEFAULT true,
    include_api_providers BOOLEAN DEFAULT true,
    strategy VARCHAR(20) DEFAULT 'round_robin' 
        CHECK (strategy IN ('round_robin', 'weighted', 'priority', 'health_based', 'least_used')),
    
    -- Balance Configuration
    api_smtp_balance_ratio DECIMAL(3,2) DEFAULT 0.70 CHECK (api_smtp_balance_ratio BETWEEN 0 AND 1),
    prefer_api_over_smtp BOOLEAN DEFAULT true,
    
    -- Fallback Configuration  
    api_fallback_to_smtp BOOLEAN DEFAULT true,
    smtp_fallback_to_api BOOLEAN DEFAULT true,
    emergency_fallback_enabled BOOLEAN DEFAULT true,
    
    -- Performance Tuning
    max_retry_attempts INTEGER DEFAULT 3 CHECK (max_retry_attempts > 0),
    retry_delay_ms INTEGER DEFAULT 1000 CHECK (retry_delay_ms >= 0),
    circuit_breaker_threshold INTEGER DEFAULT 5 CHECK (circuit_breaker_threshold > 0),
    prefer_healthy_accounts BOOLEAN DEFAULT true,
    balance_by_response_time BOOLEAN DEFAULT false,
    avoid_consecutive_same_account BOOLEAN DEFAULT false,
    
    -- Logging & Analytics
    track_performance_metrics BOOLEAN DEFAULT true,
    log_rotation_decisions BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system',
    notes TEXT
);

-- Create index for active config lookup
CREATE INDEX IF NOT EXISTS idx_email_rotation_config_active 
ON email_rotation_config(created_at DESC) 
WHERE enabled = true;

-- Insert default configuration
INSERT INTO email_rotation_config (
    enabled,
    include_api_providers,
    strategy,
    api_smtp_balance_ratio,
    prefer_api_over_smtp,
    api_fallback_to_smtp,
    smtp_fallback_to_api,
    emergency_fallback_enabled,
    max_retry_attempts,
    track_performance_metrics,
    log_rotation_decisions,
    notes
) VALUES (
    true,
    true,
    'round_robin',
    0.70, -- 70% API, 30% SMTP
    true,
    true,
    true,
    true,
    3,
    true,
    false,
    'Default hybrid rotation configuration - 70% API providers, 30% SMTP with full fallback support'
) ON CONFLICT DO NOTHING;

COMMIT;

-- ✅ Email Rotation Config table created successfully
-- Default configuration: 70% API, 30% SMTP with intelligent fallback