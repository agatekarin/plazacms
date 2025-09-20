/**
 * 📧 EmailAPIRotationService - API Provider Load Balancing Service
 *
 * Intelligent API provider selection with load balancing strategies:
 * - Fair distribution across healthy providers
 * - Rate limit awareness (hourly/daily limits)
 * - Health monitoring & auto-recovery
 * - Failure tracking & retry logic
 * - Performance metrics collection
 *
 * Compatible with Resend, Brevo, Mailjet APIs
 * PlazaCMS Email System Enhancement
 */

export interface EmailAPIProvider {
  id: string;
  name: string;
  provider_type: "resend" | "brevo" | "mailjet";
  api_key_encrypted: string;
  api_secret_encrypted?: string;
  base_url?: string;
  from_email: string;

  // Load Balancing
  weight: number;
  priority: number;
  daily_limit: number;
  hourly_limit: number;

  // Health & Status
  is_active: boolean;
  is_healthy: boolean;
  last_used_at?: Date;
  last_health_check_at?: Date;
  consecutive_failures: number;
  total_success_count: number;
  total_failure_count: number;
  cooldown_until?: Date;

  // Rate Limiting
  today_sent_count: number;
  current_hour_sent: number;
  daily_reset_at: Date;
  hourly_reset_at: Date;

  // Performance
  avg_response_time_ms: number;
  last_error_message?: string;
  last_error_at?: Date;

  // Configuration
  provider_config: Record<string, any>;
  tags: string[];
  metadata: Record<string, any>;

  created_at: Date;
  updated_at: Date;
}

export interface DecryptedAPIProvider
  extends Omit<EmailAPIProvider, "api_key_encrypted" | "api_secret_encrypted"> {
  api_key: string; // Decrypted API key
  api_secret?: string; // Decrypted API secret (if exists)
}

export interface APIProviderUsageLog {
  id: string;
  api_provider_id: string;
  provider_name: string;
  provider_type: "api";
  recipient_email: string;
  subject: string;
  status: "success" | "failed" | "timeout" | "rate_limited";
  message_id?: string;
  response_time_ms: number;
  error_code?: string;
  error_message?: string;
  rotation_strategy: string;
  was_fallback: boolean;
  attempt_number: number;
  created_at: Date;
}

export interface APIProviderHealthCheck {
  id: string;
  api_provider_id: string;
  status:
    | "healthy"
    | "unhealthy"
    | "timeout"
    | "connection_error"
    | "auth_error";
  response_time_ms: number;
  error_message?: string;
  error_code?: string;
  test_endpoint?: string;
  http_status_code?: number;
  checked_at: Date;
}

/**
 * 🔄 EmailAPIRotationService - Core API provider load balancing service
 */
export class EmailAPIRotationService {
  private sql: any;
  private lastUsedProviderId: string | null = null;
  private configCache: any = null;
  private configLastLoaded: Date | null = null;
  private readonly CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(sql: any) {
    this.sql = sql;
  }

  /**
   * 🎯 Get next API provider based on rotation strategy
   */
  async getNextProvider(
    excludeProviderIds: string[] = []
  ): Promise<DecryptedAPIProvider | null> {
    try {
      const config = await this.getRotationConfig();

      if (!config?.enabled || !config?.include_api_providers) {
        console.log("[APIRotation] API provider rotation disabled");
        return null;
      }

      const availableProviders = await this.getAvailableProviders(
        excludeProviderIds
      );

      if (availableProviders.length === 0) {
        console.warn("[APIRotation] No available API providers found");
        return null;
      }

      // Select provider based on configured strategy
      const selectedProvider = this.selectProviderByStrategy(
        availableProviders,
        config.strategy
      );

      // Decrypt API credentials
      const decryptedProvider: DecryptedAPIProvider = {
        ...selectedProvider,
        api_key: this.decryptApiKey(selectedProvider.api_key_encrypted),
        api_secret: selectedProvider.api_secret_encrypted
          ? this.decryptApiKey(selectedProvider.api_secret_encrypted)
          : undefined,
      };

      // Update last used timestamp
      await this.updateLastUsed(selectedProvider.id);
      this.lastUsedProviderId = selectedProvider.id;

      if (config.log_rotation_decisions) {
        console.log(
          `[APIRotation] Selected ${selectedProvider.name} (${selectedProvider.provider_type}) - Strategy: ${config.strategy}`
        );
      }

      return decryptedProvider;
    } catch (error) {
      console.error("[APIRotation] Error selecting provider:", error);
      return null;
    }
  }

  /**
   * 🎯 Select provider based on configured strategy
   */
  private selectProviderByStrategy(
    providers: EmailAPIProvider[],
    strategy: string = "round_robin"
  ): EmailAPIProvider {
    switch (strategy) {
      case "priority":
        return providers.sort((a, b) => a.priority - b.priority)[0];

      case "weighted":
        return this.selectByWeight(providers);

      case "health_based":
        const healthyProviders = providers.filter(
          (p) => p.is_healthy && p.consecutive_failures === 0
        );
        return healthyProviders.length > 0
          ? this.selectByWeight(healthyProviders)
          : this.selectByWeight(providers);

      case "least_used":
        return providers.sort((a, b) => {
          const aLastUsed = a.last_used_at?.getTime() || 0;
          const bLastUsed = b.last_used_at?.getTime() || 0;
          return aLastUsed - bLastUsed;
        })[0];

      case "round_robin":
      default:
        // Round robin selection based on last_used_at for persistent state
        return this.selectRoundRobin(providers);
    }
  }

  /**
   * 🔄 Round robin selection with persistent state
   */
  private selectRoundRobin(providers: EmailAPIProvider[]): EmailAPIProvider {
    // Sort providers by name for consistent ordering
    const sortedProviders = [...providers].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Find the provider with the most recent last_used_at
    const lastUsedProvider = sortedProviders.reduce((latest, current) => {
      const currentLastUsed = current.last_used_at?.getTime() || 0;
      const latestLastUsed = latest.last_used_at?.getTime() || 0;
      return currentLastUsed > latestLastUsed ? current : latest;
    }, sortedProviders[0]);

    // Find the index of last used provider
    const lastUsedIndex = sortedProviders.findIndex(
      (p) => p.id === lastUsedProvider.id
    );

    // Select next provider in round robin fashion
    const nextIndex = (lastUsedIndex + 1) % sortedProviders.length;

    console.log(
      `[APIRotation] Round robin: last used was ${lastUsedProvider.name} (index: ${lastUsedIndex}), selecting ${sortedProviders[nextIndex].name} (index: ${nextIndex})`
    );

    return sortedProviders[nextIndex];
  }

  /**
   * ⚖️ Weighted random selection
   */
  private selectByWeight(providers: EmailAPIProvider[]): EmailAPIProvider {
    const totalWeight = providers.reduce(
      (sum, provider) => sum + provider.weight,
      0
    );
    let random = Math.random() * totalWeight;

    for (const provider of providers) {
      random -= provider.weight;
      if (random <= 0) {
        return provider;
      }
    }

    return providers[0]; // Fallback
  }

  /**
   * 📋 Get available API providers for rotation
   */
  private async getAvailableProviders(
    excludeProviderIds: string[] = []
  ): Promise<EmailAPIProvider[]> {
    const providers = await this.sql`
      SELECT * FROM email_api_providers
      WHERE 
        is_active = true
        AND (cooldown_until IS NULL OR cooldown_until <= NOW())
        AND today_sent_count < daily_limit
        AND current_hour_sent < hourly_limit
        ${
          excludeProviderIds.length > 0
            ? this.sql`AND id != ALL(${excludeProviderIds}::uuid[])`
            : this.sql``
        }
      ORDER BY priority ASC, weight DESC
    `;

    return providers.map((provider: any) => ({
      ...provider,
      tags: Array.isArray(provider.tags) ? provider.tags : [],
      metadata: provider.metadata || {},
      provider_config: provider.provider_config || {},
    }));
  }

  /**
   * 🔧 Get rotation configuration
   */
  private async getRotationConfig(): Promise<any> {
    // Use cached config if still valid
    if (
      this.configCache &&
      this.configLastLoaded &&
      Date.now() - this.configLastLoaded.getTime() < this.CONFIG_CACHE_TTL_MS
    ) {
      return this.configCache;
    }

    try {
      const [config] = await this.sql`
        SELECT * FROM email_rotation_config
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!config) {
        console.warn("[APIRotation] No rotation config found, using defaults");
        return {
          enabled: false,
          include_api_providers: false,
          strategy: "round_robin",
          log_rotation_decisions: false,
        };
      }

      this.configCache = config;
      this.configLastLoaded = new Date();
      return config;
    } catch (error) {
      console.error("[APIRotation] Error loading config:", error);
      return {
        enabled: false,
        include_api_providers: false,
        strategy: "round_robin",
        log_rotation_decisions: false,
      };
    }
  }

  /**
   * 📝 Update last used timestamp
   */
  private async updateLastUsed(providerId: string): Promise<void> {
    try {
      await this.sql`
        UPDATE email_api_providers 
        SET 
          last_used_at = NOW(),
          today_sent_count = today_sent_count + 1,
          current_hour_sent = current_hour_sent + 1
        WHERE id = ${providerId}
      `;
    } catch (error) {
      console.error("[APIRotation] Error updating last used:", error);
    }
  }

  /**
   * 📊 Record successful email send
   */
  async recordSuccess(
    providerId: string,
    recipientEmail: string,
    subject: string,
    messageId: string,
    responseTimeMs: number,
    rotationStrategy: string
  ): Promise<void> {
    try {
      // Update provider stats
      await this.sql`
        UPDATE email_api_providers 
        SET 
          total_success_count = total_success_count + 1,
          consecutive_failures = 0,
          is_healthy = true,
          avg_response_time_ms = (avg_response_time_ms + ${responseTimeMs}) / 2,
          last_error_message = NULL,
          last_error_at = NULL
        WHERE id = ${providerId}
      `;

      // Log usage
      await this.logUsage({
        providerId,
        recipientEmail,
        subject,
        messageId,
        status: "success",
        responseTimeMs,
        rotationStrategy,
        wasFallback: false,
        attemptNumber: 1,
      });
    } catch (error) {
      console.error("[APIRotation] Error recording success:", error);
    }
  }

  /**
   * ❌ Record failed email send
   */
  async recordFailure(
    providerId: string,
    recipientEmail: string,
    subject: string,
    errorCode: string,
    errorMessage: string,
    responseTimeMs: number,
    rotationStrategy: string,
    attemptNumber: number = 1
  ): Promise<void> {
    try {
      // Update provider stats
      await this.sql`
        UPDATE email_api_providers 
        SET 
          total_failure_count = total_failure_count + 1,
          consecutive_failures = consecutive_failures + 1,
          last_error_message = ${errorMessage},
          last_error_at = NOW(),
          is_healthy = CASE 
            WHEN consecutive_failures + 1 >= 5 THEN false 
            ELSE is_healthy 
          END,
          cooldown_until = CASE 
            WHEN consecutive_failures + 1 >= 3 THEN NOW() + INTERVAL '30 minutes'
            ELSE cooldown_until 
          END
        WHERE id = ${providerId}
      `;

      // Log usage
      await this.logUsage({
        providerId,
        recipientEmail,
        subject,
        status: "failed",
        errorCode,
        errorMessage,
        responseTimeMs,
        rotationStrategy,
        wasFallback: false,
        attemptNumber,
      });
    } catch (error) {
      console.error("[APIRotation] Error recording failure:", error);
    }
  }

  /**
   * 💊 Check provider health
   */
  async checkProviderHealth(providerId: string): Promise<boolean> {
    try {
      const [provider] = await this.sql`
        SELECT * FROM email_api_providers WHERE id = ${providerId}
      `;

      if (!provider) {
        return false;
      }

      // Simple health check - could be enhanced with actual API calls
      const isHealthy =
        provider.is_active &&
        provider.consecutive_failures < 5 &&
        (!provider.cooldown_until ||
          new Date(provider.cooldown_until) <= new Date());

      // Record health check
      await this.sql`
        INSERT INTO email_api_health_checks (
          api_provider_id, status, response_time_ms, checked_at
        ) VALUES (
          ${providerId}, 
          ${isHealthy ? "healthy" : "unhealthy"}, 
          0, 
          NOW()
        )
      `;

      // Update provider health status
      await this.sql`
        UPDATE email_api_providers 
        SET 
          is_healthy = ${isHealthy},
          last_health_check_at = NOW()
        WHERE id = ${providerId}
      `;

      return isHealthy;
    } catch (error) {
      console.error("[APIRotation] Error checking health:", error);
      return false;
    }
  }

  /**
   * 📊 Get provider statistics
   */
  async getProviderStats(providerId?: string): Promise<any> {
    try {
      const whereClause = providerId
        ? this.sql`WHERE id = ${providerId}`
        : this.sql``;

      return await this.sql`
        SELECT 
          id,
          name,
          provider_type,
          is_active,
          is_healthy,
          weight,
          priority,
          daily_limit,
          hourly_limit,
          today_sent_count,
          current_hour_sent,
          total_success_count,
          total_failure_count,
          consecutive_failures,
          avg_response_time_ms,
          last_used_at,
          last_health_check_at,
          last_error_message,
          last_error_at,
          created_at
        FROM email_api_providers
        ${whereClause}
        ORDER BY priority ASC, name ASC
      `;
    } catch (error) {
      console.error("[APIRotation] Error getting stats:", error);
      return [];
    }
  }

  /**
   * 📝 Log usage for analytics
   */
  private async logUsage(params: {
    providerId: string;
    recipientEmail: string;
    subject: string;
    messageId?: string;
    status: "success" | "failed" | "timeout" | "rate_limited";
    errorCode?: string;
    errorMessage?: string;
    responseTimeMs: number;
    rotationStrategy: string;
    wasFallback: boolean;
    attemptNumber: number;
  }): Promise<void> {
    try {
      // Get provider name for logging
      const [provider] = await this.sql`
        SELECT name, provider_type FROM email_api_providers WHERE id = ${params.providerId}
      `;

      if (!provider) return;

      await this.sql`
        INSERT INTO email_usage_logs (
          account_id,
          provider_type,
          api_provider_id,
          provider_name,
          recipient_email,
          subject,
          status,
          message_id,
          response_time_ms,
          error_code,
          error_message,
          rotation_strategy,
          was_fallback,
          attempt_number,
          created_at
        ) VALUES (
          ${params.providerId},
          'api',
          ${params.providerId},
          ${provider.name},
          ${params.recipientEmail},
          ${params.subject},
          ${params.status},
          ${params.messageId || null},
          ${params.responseTimeMs},
          ${params.errorCode || null},
          ${params.errorMessage || null},
          ${params.rotationStrategy},
          ${params.wasFallback},
          ${params.attemptNumber},
          NOW()
        )
      `;
    } catch (error) {
      console.error("[APIRotation] Error logging usage:", error);
    }
  }

  /**
   * 🔐 Decrypt API key (placeholder - implement with proper encryption)
   */
  private decryptApiKey(encryptedKey: string): string {
    // TODO: Implement proper decryption
    // For now, return the encrypted key as-is (placeholder keys)
    return encryptedKey;
  }

  /**
   * 🔄 Reset daily/hourly counters
   */
  async resetCounters(): Promise<void> {
    try {
      // Reset daily counters
      await this.sql`
        UPDATE email_api_providers 
        SET 
          today_sent_count = 0,
          daily_reset_at = CURRENT_DATE
        WHERE daily_reset_at < CURRENT_DATE
      `;

      // Reset hourly counters
      await this.sql`
        UPDATE email_api_providers 
        SET 
          current_hour_sent = 0,
          hourly_reset_at = DATE_TRUNC('hour', NOW())
        WHERE hourly_reset_at < DATE_TRUNC('hour', NOW())
      `;
    } catch (error) {
      console.error("[APIRotation] Error resetting counters:", error);
    }
  }

  /**
   * 🧹 Cleanup old health checks and logs
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up old health checks (keep last 30 days)
      await this.sql`
        DELETE FROM email_api_health_checks 
        WHERE checked_at < NOW() - INTERVAL '30 days'
      `;

      console.log("[APIRotation] Cleanup completed");
    } catch (error) {
      console.error("[APIRotation] Error during cleanup:", error);
    }
  }
}

/**
 * Factory function to create EmailAPIRotationService instance
 */
export function createEmailAPIRotationService(
  sql: any
): EmailAPIRotationService {
  return new EmailAPIRotationService(sql);
}
