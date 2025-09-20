# 📧 Email API Rotation System - Implementation Plan

## 🎯 Overview

Plan untuk mengimplementasi sistem rotasi email yang mendukung API providers (Resend, Brevo, Mailjet) selain SMTP, dengan load balancing intelligent yang terintegrasi dengan sistem Multi-SMTP yang sudah ada.

## 📊 Current System Analysis

### Existing Infrastructure ✅

1. **EmailService Class** - Main service dengan provider support:

   - ✅ Resend API
   - ✅ SMTP (single & multi)
   - ✅ Cloudflare Workers Email

2. **SMTPRotationService** - Sophisticated load balancing:

   - ✅ Multiple strategies (round_robin, weighted, priority, health_based, least_used)
   - ✅ Rate limiting (hourly/daily limits)
   - ✅ Health monitoring with auto-recovery
   - ✅ Failure tracking & retry logic
   - ✅ Performance metrics collection

3. **Database Schema** ✅:
   - `email_settings` - Main configuration
   - `smtp_accounts` - SMTP accounts pool
   - `smtp_rotation_config` - Rotation strategies
   - `smtp_usage_logs` - Usage tracking
   - `smtp_account_health_checks` - Health monitoring

## 🚀 Proposed Architecture

### 1. Database Schema Extensions

#### New Table: `email_api_providers`

```sql
CREATE TABLE email_api_providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(255) NOT NULL UNIQUE,
  provider_type varchar(20) NOT NULL, -- 'resend', 'brevo', 'mailjet'
  api_key_encrypted text NOT NULL,
  api_secret_encrypted text NULL, -- For providers requiring secret
  base_url varchar(500) DEFAULT NULL, -- Custom endpoints if needed

  -- Rotation & Load Balancing
  weight int DEFAULT 1 CHECK (weight > 0),
  priority int DEFAULT 100, -- 1=highest, 1000=lowest
  daily_limit int DEFAULT 10000,
  hourly_limit int DEFAULT 1000,

  -- Health & Performance
  is_active boolean DEFAULT true,
  is_healthy boolean DEFAULT true,
  last_used_at timestamptz,
  last_health_check_at timestamptz DEFAULT now(),
  consecutive_failures int DEFAULT 0,
  total_success_count int DEFAULT 0,
  total_failure_count int DEFAULT 0,
  cooldown_until timestamptz,

  -- Rate Limiting Tracking
  today_sent_count int DEFAULT 0,
  current_hour_sent int DEFAULT 0,
  daily_reset_at date DEFAULT CURRENT_DATE,
  hourly_reset_at timestamptz DEFAULT date_trunc('hour', now()),

  -- Performance Metrics
  avg_response_time_ms int DEFAULT 0,
  last_error_message text,
  last_error_at timestamptz,

  -- Metadata & Configuration
  provider_config jsonb DEFAULT '{}', -- Provider-specific settings
  tags jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT email_api_providers_type_check
    CHECK (provider_type IN ('resend', 'brevo', 'mailjet'))
);

-- Indexes
CREATE INDEX idx_api_providers_active_healthy ON email_api_providers (is_active, is_healthy);
CREATE INDEX idx_api_providers_priority ON email_api_providers (priority) WHERE is_active = true;
CREATE INDEX idx_api_providers_weight ON email_api_providers (weight) WHERE is_active = true AND is_healthy = true;
CREATE INDEX idx_api_providers_type ON email_api_providers (provider_type);
CREATE INDEX idx_api_providers_daily_usage ON email_api_providers (daily_reset_at, today_sent_count);
```

#### New Table: `email_api_health_checks`

```sql
CREATE TABLE email_api_health_checks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_provider_id uuid NOT NULL REFERENCES email_api_providers(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'timeout', 'connection_error')),
  response_time_ms int DEFAULT 0,
  error_message text,
  error_code varchar(50),
  test_endpoint varchar(500),
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_health_checks_provider_status ON email_api_health_checks (api_provider_id, status);
CREATE INDEX idx_api_health_checks_checked_at ON email_api_health_checks (checked_at);
```

#### Extend `smtp_rotation_config` → `email_rotation_config`

```sql
-- Rename table to be more generic
ALTER TABLE smtp_rotation_config RENAME TO email_rotation_config;

-- Add new columns
ALTER TABLE email_rotation_config ADD COLUMN include_api_providers boolean DEFAULT false;
ALTER TABLE email_rotation_config ADD COLUMN api_smtp_balance_ratio numeric(3,2) DEFAULT 0.50 CHECK (api_smtp_balance_ratio BETWEEN 0 AND 1);
-- 0.5 = 50% API, 50% SMTP
ALTER TABLE email_rotation_config ADD COLUMN prefer_api_over_smtp boolean DEFAULT true;
ALTER TABLE email_rotation_config ADD COLUMN api_fallback_to_smtp boolean DEFAULT true;
ALTER TABLE email_rotation_config ADD COLUMN smtp_fallback_to_api boolean DEFAULT true;

-- Update constraint name
ALTER TABLE email_rotation_config DROP CONSTRAINT smtp_rotation_config_strategy_check;
ALTER TABLE email_rotation_config ADD CONSTRAINT email_rotation_config_strategy_check
  CHECK (strategy IN ('round_robin', 'weighted', 'priority', 'health_based', 'least_used'));
```

#### Extend Usage Logs

```sql
-- Add API provider tracking to existing smtp_usage_logs
ALTER TABLE smtp_usage_logs RENAME TO email_usage_logs;
ALTER TABLE email_usage_logs ADD COLUMN provider_type varchar(10) DEFAULT 'smtp'
  CHECK (provider_type IN ('smtp', 'api'));
ALTER TABLE email_usage_logs ADD COLUMN api_provider_id uuid REFERENCES email_api_providers(id) ON DELETE SET NULL;
ALTER TABLE email_usage_logs RENAME COLUMN smtp_account_id TO account_id; -- Generic name
```

### 2. Core Services Architecture

#### EmailAPIProvider Interface

```typescript
export interface EmailAPIProvider {
  readonly providerType: "resend" | "brevo" | "mailjet";
  readonly name: string;
  readonly isHealthy: boolean;

  sendEmail(params: SendEmailParams): Promise<EmailSendResult>;
  checkHealth(): Promise<boolean>;
  getUsageStats(): Promise<ProviderUsageStats>;
  validateConfig(): Promise<boolean>;
}
```

#### Provider Adapters

- **ResendAdapter** - Existing Resend integration
- **BrevoAdapter** - New Brevo/Sendinblue integration
- **MailjetAdapter** - New Mailjet integration

#### HybridEmailRotationService

```typescript
export class HybridEmailRotationService {
  private smtpRotationService: SMTPRotationService;
  private apiRotationService: EmailAPIRotationService;

  async getNextProvider(
    excludeIds: string[] = []
  ): Promise<EmailProvider | null> {
    // Intelligent selection between SMTP and API providers
    // Based on configuration, health, performance, and load
  }

  private selectProviderType(): "smtp" | "api" {
    // Logic to decide between SMTP vs API based on:
    // - api_smtp_balance_ratio
    // - Current health status
    // - Rate limits
    // - Performance metrics
  }
}
```

## 🛠️ Implementation Phases

### Phase 1: Database & Core Infrastructure ⚡

1. **Database Migration**

   - Create new tables (`email_api_providers`, `email_api_health_checks`)
   - Extend existing tables
   - Create indexes and constraints
   - Create functions for counter resets

2. **Core Services**
   - `EmailAPIRotationService` - API provider rotation logic
   - `HybridEmailRotationService` - Combined SMTP + API rotation
   - Provider adapters (Resend, Brevo, Mailjet)

### Phase 2: API Provider Implementations 🔌

1. **Brevo Adapter**

   - API client setup
   - Send email implementation
   - Health check endpoint
   - Rate limiting handling

2. **Mailjet Adapter**

   - API client setup
   - Send email implementation (v3.1)
   - Health check endpoint
   - Rate limiting handling

3. **Enhanced Resend Adapter**
   - Refactor existing to match interface
   - Add health checks
   - Usage tracking

### Phase 3: Integration & Enhancement 🔄

1. **Update EmailService**

   - Integrate HybridEmailRotationService
   - Update provider selection logic
   - Enhanced error handling & fallbacks

2. **Analytics & Monitoring**
   - Extend usage logs for API providers
   - Performance tracking
   - Health monitoring
   - Usage statistics

### Phase 4: Admin Interface 💻

1. **API Providers Management**

   - CRUD operations for API providers
   - Configuration UI
   - Health status dashboard

2. **Rotation Configuration**

   - Hybrid rotation settings
   - Balance ratio controls
   - Fallback configurations

3. **Analytics Dashboard**
   - Combined SMTP + API usage stats
   - Performance comparisons
   - Health monitoring

### Phase 5: Testing & Documentation 🧪

1. **Comprehensive Testing**

   - Unit tests for all services
   - Integration tests
   - Performance benchmarks

2. **Documentation**
   - API documentation
   - Configuration guide
   - Migration guide

## 🎛️ Configuration Features

### Rotation Strategies

- **Round Robin** - Fair distribution across all providers
- **Weighted** - Based on provider weights and capacity
- **Priority** - Prefer high-priority providers first
- **Health Based** - Avoid unhealthy providers
- **Least Used** - Use provider with lowest recent usage

### Balance Control

- **API/SMTP Ratio** - Control distribution between API and SMTP (e.g., 70% API, 30% SMTP)
- **Provider Preferences** - Prefer specific providers or types
- **Intelligent Fallback** - Auto-switch when providers fail

### Advanced Features

- **Rate Limit Awareness** - Automatic throttling based on provider limits
- **Performance Optimization** - Route emails based on response times
- **Cost Optimization** - Route based on provider costs
- **Geographic Routing** - Route based on recipient regions (future)

## 📊 Benefits

### Performance ⚡

- **Distributed Load** - No single point of failure
- **Optimal Routing** - Route emails through best-performing provider
- **Rate Limit Management** - Automatic handling of provider limits

### Reliability 🛡️

- **High Availability** - Multiple fallback options
- **Auto-Recovery** - Automatic retry with different providers
- **Health Monitoring** - Proactive provider health checks

### Scalability 📈

- **Horizontal Scaling** - Add more providers as needed
- **Dynamic Configuration** - Runtime configuration changes
- **Usage Analytics** - Data-driven optimization

## 🚨 Migration Strategy

### Backward Compatibility ✅

- Existing SMTP rotation continues to work
- Current email settings remain valid
- Gradual migration path

### Migration Steps

1. Deploy database changes
2. Deploy new services (API providers disabled)
3. Configure API providers
4. Enable hybrid rotation
5. Monitor and optimize

## 🔒 Security Considerations

- **API Key Encryption** - All API keys stored encrypted
- **Access Control** - Admin-only access to provider configs
- **Audit Logging** - All configuration changes logged
- **Rate Limit Protection** - Prevent API abuse

## 📈 Success Metrics

- **Delivery Rate** - Improved email delivery success
- **Response Times** - Faster email sending
- **Uptime** - Higher system availability
- **Cost Efficiency** - Optimized provider usage costs

---

## 🚀 Next Steps

1. ✅ **Analysis Complete** - Current system analyzed
2. 🔄 **Schema Design** - Database extensions planned
3. ⏳ **Implementation** - Ready to start coding
4. ⏳ **Testing** - Comprehensive testing plan
5. ⏳ **Documentation** - User and developer docs

---

_This plan ensures a sophisticated, scalable, and reliable email rotation system that leverages the best of both SMTP and modern email APIs._
