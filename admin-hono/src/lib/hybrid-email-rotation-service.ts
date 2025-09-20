/**
 * 🔄 HybridEmailRotationService - Unified SMTP + API Provider Rotation
 *
 * Intelligent load balancing between SMTP accounts and API providers:
 * - Configurable balance ratio (e.g., 70% API, 30% SMTP)
 * - Multi-level fallback strategies
 * - Health-based routing decisions
 * - Performance-optimized provider selection
 * - Unified analytics and monitoring
 *
 * Combines SMTPRotationService + EmailAPIRotationService
 * PlazaCMS Email System Enhancement
 */

import {
  SMTPRotationService,
  DecryptedSMTPAccount,
} from "./smtp-rotation-service";
import {
  EmailAPIRotationService,
  DecryptedAPIProvider,
} from "./email-api-rotation-service";
import {
  EmailAPIProviderAdapter,
  createProviderAdapter,
  SendEmailParams,
  EmailSendResult,
} from "./email-api-adapters";

export type ProviderType = "smtp" | "api";

export interface UnifiedEmailProvider {
  type: ProviderType;
  id: string;
  name: string;
  priority: number;
  weight: number;
  isHealthy: boolean;
  isActive: boolean;
  lastUsedAt?: Date;

  // Type-specific data
  smtpAccount?: DecryptedSMTPAccount;
  apiProvider?: DecryptedAPIProvider;
  apiAdapter?: EmailAPIProviderAdapter;
}

export interface HybridRotationConfig {
  enabled: boolean;
  include_api_providers: boolean;
  strategy:
    | "round_robin"
    | "weighted"
    | "priority"
    | "health_based"
    | "least_used";

  // Balance Configuration
  api_smtp_balance_ratio: number; // 0.0 = all SMTP, 1.0 = all API
  prefer_api_over_smtp: boolean;

  // Fallback Configuration
  api_fallback_to_smtp: boolean;
  smtp_fallback_to_api: boolean;
  emergency_fallback_enabled: boolean;

  // Performance Tuning
  max_retry_attempts: number;
  retry_delay_seconds: number;
  failure_cooldown_minutes: number;
  prefer_healthy_accounts: boolean;
  balance_by_response_time: boolean;
  avoid_consecutive_same_account: boolean;

  // Logging & Analytics
  track_performance_metrics: boolean;
  log_rotation_decisions: boolean;
}

/**
 * 🔄 HybridEmailRotationService - Main orchestration service
 */
export class HybridEmailRotationService {
  private smtpRotationService: SMTPRotationService;
  private apiRotationService: EmailAPIRotationService;
  private sql: any;
  private config: HybridRotationConfig | null = null;
  private configLastLoaded: Date | null = null;
  private readonly CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private lastProviderType: ProviderType | null = null;
  private apiProviderCache: Map<string, EmailAPIProviderAdapter> = new Map();

  /**
   * 🔄 Clear adapter cache (useful after provider config changes)
   */
  clearAdapterCache(): void {
    this.apiProviderCache.clear();
    console.log("[HybridRotation] Adapter cache cleared");
  }

  constructor(
    smtpRotationService: SMTPRotationService,
    apiRotationService: EmailAPIRotationService,
    sql: any
  ) {
    this.smtpRotationService = smtpRotationService;
    this.apiRotationService = apiRotationService;
    this.sql = sql;
  }

  /**
   * 🎯 Get next email provider (SMTP or API) based on hybrid strategy
   */
  async getNextProvider(
    excludeIds: string[] = []
  ): Promise<UnifiedEmailProvider | null> {
    try {
      const config = await this.loadConfig();

      if (!config?.enabled) {
        console.log(
          "[HybridRotation] Hybrid rotation disabled, using fallback"
        );
        return await this.getFallbackProvider();
      }

      // Decide between SMTP and API providers
      const selectedType = this.selectProviderType(config);

      // Get provider based on selected type
      let provider: UnifiedEmailProvider | null = null;

      if (selectedType === "api" && config.include_api_providers) {
        provider = await this.getAPIProvider(
          excludeIds.filter((id) => id.startsWith("api:"))
        );
      }

      if (!provider && config.smtp_fallback_to_api === false) {
        // API failed and fallback to SMTP is disabled
        return null;
      }

      if (!provider) {
        // Fallback to SMTP or primary fallback
        provider = await this.getSMTPProvider(
          excludeIds.filter((id) => id.startsWith("smtp:"))
        );
      }

      // Final fallback attempt
      if (!provider && config.api_fallback_to_smtp && selectedType === "smtp") {
        provider = await this.getAPIProvider(
          excludeIds.filter((id) => id.startsWith("api:"))
        );
      }

      if (provider && config.log_rotation_decisions) {
        console.log(
          `[HybridRotation] Selected ${provider.type.toUpperCase()} provider: ${
            provider.name
          } (Strategy: ${config.strategy})`
        );
      }

      this.lastProviderType = provider?.type || null;
      return provider;
    } catch (error) {
      console.error("[HybridRotation] Error selecting provider:", error);
      return await this.getFallbackProvider();
    }
  }

  /**
   * 📧 Send email using selected provider
   */
  async sendEmail(
    provider: UnifiedEmailProvider,
    params: SendEmailParams
  ): Promise<EmailSendResult> {
    const startTime = Date.now();

    try {
      if (provider.type === "api" && provider.apiAdapter) {
        // Send via API provider
        const result = await provider.apiAdapter.sendEmail(params);

        // Record result
        if (provider.apiProvider) {
          if (result.success) {
            await this.apiRotationService.recordSuccess(
              provider.apiProvider.id,
              Array.isArray(params.to) ? params.to.join(", ") : params.to,
              params.subject,
              result.messageId || "",
              result.responseTime || Date.now() - startTime,
              "hybrid_rotation"
            );
          } else {
            await this.apiRotationService.recordFailure(
              provider.apiProvider.id,
              Array.isArray(params.to) ? params.to.join(", ") : params.to,
              params.subject,
              result.errorCode || "UNKNOWN_ERROR",
              result.error || "Unknown error",
              result.responseTime || Date.now() - startTime,
              "hybrid_rotation"
            );
          }
        }

        return result;
      } else if (provider.type === "smtp" && provider.smtpAccount) {
        // Send via SMTP provider
        // This would need to be implemented based on your existing SMTP sending logic
        // For now, returning a placeholder result
        return {
          success: false,
          error: "SMTP sending not implemented in hybrid service yet",
          errorCode: "NOT_IMPLEMENTED",
          responseTime: Date.now() - startTime,
        };
      } else {
        return {
          success: false,
          error: "Invalid provider configuration",
          errorCode: "INVALID_PROVIDER",
          responseTime: Date.now() - startTime,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Record failure
      if (provider.type === "api" && provider.apiProvider) {
        await this.apiRotationService.recordFailure(
          provider.apiProvider.id,
          Array.isArray(params.to) ? params.to.join(", ") : params.to,
          params.subject,
          "SEND_ERROR",
          error.message || "Unknown send error",
          responseTime,
          "hybrid_rotation"
        );
      }

      return {
        success: false,
        error: error.message || "Unknown error during send",
        errorCode: "SEND_ERROR",
        responseTime,
      };
    }
  }

  /**
   * 📊 Get comprehensive statistics
   */
  async getStats(): Promise<{
    overview: {
      total_emails_sent: number;
      success_rate: number;
      avg_response_time: number;
      active_providers: number;
      total_providers: number;
    };
    smtp_stats: {
      total_accounts: number;
      healthy_accounts: number;
      total_sent: number;
      avg_response_time: number;
    };
    api_stats: {
      total_providers: number;
      healthy_providers: number;
      total_sent: number;
      avg_response_time: number;
    };
    hybrid_stats: {
      api_ratio: number;
      smtp_ratio: number;
      total_emails: number;
      success_rate: number;
    };
    recent_activity: Array<{
      id: string;
      timestamp: string;
      provider_name: string;
      provider_type: "smtp" | "api";
      recipient: string;
      status: "success" | "failed";
      response_time: number;
    }>;
    provider_performance: Array<{
      name: string;
      type: "smtp" | "api";
      success_rate: number;
      total_sent: number;
      avg_response_time: number;
      is_healthy: boolean;
    }>;
  }> {
    try {
      // Get SMTP stats
      const smtpStatsRaw = await this.smtpRotationService.getRotationStats();
      const smtpStats = smtpStatsRaw.accounts || [];

      // Get API stats
      const apiStatsRaw = await this.apiRotationService.getProviderStats();
      const apiStats = Array.isArray(apiStatsRaw) ? apiStatsRaw : [];

      // Get usage statistics from logs
      const usageStatsResult = await this.sql`
        SELECT 
          COUNT(*) as total_sent,
          COUNT(CASE WHEN provider_type = 'smtp' THEN 1 END) as smtp_sent,
          COUNT(CASE WHEN provider_type = 'api' THEN 1 END) as api_sent,
          COUNT(CASE WHEN status = 'success' THEN 1 END)::float / NULLIF(COUNT(*), 0)::float as success_rate,
          AVG(response_time_ms) as avg_response_time
        FROM email_usage_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;
      const usageStats = usageStatsResult[0] || {
        total_sent: 0,
        smtp_sent: 0,
        api_sent: 0,
        success_rate: 0,
        avg_response_time: 0,
      };

      // Get recent activity
      const recentActivity = await this.sql`
        SELECT 
          id,
          created_at as timestamp,
          provider_name,
          provider_type,
          recipient_email as recipient,
          status,
          response_time_ms as response_time
        FROM email_usage_logs 
        ORDER BY created_at DESC 
        LIMIT 50
      `;

      // Calculate provider stats
      const smtpHealthy = smtpStats.filter((s: any) => s.is_healthy).length;
      const apiHealthy = apiStats.filter((s: any) => s.is_healthy).length;
      const totalProviders = smtpStats.length + apiStats.length;
      const activeProviders = smtpHealthy + apiHealthy;

      const totalSent = parseInt(usageStats.total_sent) || 0;
      const smtpSent = parseInt(usageStats.smtp_sent) || 0;
      const apiSent = parseInt(usageStats.api_sent) || 0;
      const successRate = parseFloat(usageStats.success_rate) || 0;

      // Calculate provider performance
      const providerPerformance = [
        ...smtpStats.map((stat: any) => ({
          name: stat.account_name || stat.host || "SMTP Account",
          type: "smtp" as const,
          success_rate:
            stat.total_emails > 0
              ? ((stat.successful_emails || 0) / (stat.total_emails || 1)) * 100
              : 0,
          total_sent: stat.successful_emails || 0,
          avg_response_time: stat.avg_response_time || 0,
          is_healthy: stat.is_healthy || false,
        })),
        ...apiStats.map((stat: any) => ({
          name: stat.name || "API Provider",
          type: "api" as const,
          success_rate:
            stat.total_success_count && stat.total_failure_count
              ? (stat.total_success_count /
                  (stat.total_success_count + stat.total_failure_count)) *
                100
              : 0,
          total_sent: stat.total_success_count || 0,
          avg_response_time: stat.avg_response_time_ms || 0,
          is_healthy: stat.is_healthy || false,
        })),
      ].sort((a, b) => b.success_rate - a.success_rate);

      return {
        overview: {
          total_emails_sent: totalSent,
          success_rate: successRate * 100,
          avg_response_time: parseInt(usageStats.avg_response_time) || 0,
          active_providers: activeProviders,
          total_providers: totalProviders,
        },
        smtp_stats: {
          total_accounts: smtpStats.length,
          healthy_accounts: smtpHealthy,
          total_sent: smtpSent,
          avg_response_time:
            smtpStats.reduce(
              (acc: number, stat: any) => acc + (stat.avg_response_time || 0),
              0
            ) / Math.max(smtpStats.length, 1),
        },
        api_stats: {
          total_providers: apiStats.length,
          healthy_providers: apiHealthy,
          total_sent: apiSent,
          avg_response_time:
            apiStats.reduce(
              (acc: number, stat: any) =>
                acc + (stat.avg_response_time_ms || 0),
              0
            ) / Math.max(apiStats.length, 1),
        },
        hybrid_stats: {
          api_ratio: totalSent > 0 ? (apiSent / totalSent) * 100 : 0,
          smtp_ratio: totalSent > 0 ? (smtpSent / totalSent) * 100 : 0,
          total_emails: totalSent,
          success_rate: successRate * 100,
        },
        recent_activity: recentActivity.map((activity: any) => ({
          id: activity.id,
          timestamp: activity.timestamp,
          provider_name: activity.provider_name,
          provider_type: activity.provider_type,
          recipient: activity.recipient,
          status: activity.status,
          response_time: activity.response_time || 0,
        })),
        provider_performance: providerPerformance,
      };
    } catch (error) {
      console.error("[HybridRotation] Error getting stats:", error);
      return {
        overview: {
          total_emails_sent: 0,
          success_rate: 0,
          avg_response_time: 0,
          active_providers: 0,
          total_providers: 0,
        },
        smtp_stats: {
          total_accounts: 0,
          healthy_accounts: 0,
          total_sent: 0,
          avg_response_time: 0,
        },
        api_stats: {
          total_providers: 0,
          healthy_providers: 0,
          total_sent: 0,
          avg_response_time: 0,
        },
        hybrid_stats: {
          api_ratio: 0,
          smtp_ratio: 0,
          total_emails: 0,
          success_rate: 0,
        },
        recent_activity: [],
        provider_performance: [],
      };
    }
  }

  /**
   * 🔧 Update configuration
   */
  async updateConfig(newConfig: Partial<HybridRotationConfig>): Promise<void> {
    try {
      const currentConfig = await this.loadConfig();
      const updatedConfig = { ...currentConfig, ...newConfig };

      await this.sql`
        UPDATE email_rotation_config 
        SET 
          enabled = ${updatedConfig.enabled},
          include_api_providers = ${updatedConfig.include_api_providers},
          strategy = ${updatedConfig.strategy},
          api_smtp_balance_ratio = ${updatedConfig.api_smtp_balance_ratio},
          prefer_api_over_smtp = ${updatedConfig.prefer_api_over_smtp},
          api_fallback_to_smtp = ${updatedConfig.api_fallback_to_smtp},
          smtp_fallback_to_api = ${updatedConfig.smtp_fallback_to_api},
          emergency_fallback_enabled = ${updatedConfig.emergency_fallback_enabled},
          max_retry_attempts = ${updatedConfig.max_retry_attempts},
          retry_delay_seconds = ${updatedConfig.retry_delay_seconds},
          failure_cooldown_minutes = ${updatedConfig.failure_cooldown_minutes},
          prefer_healthy_accounts = ${updatedConfig.prefer_healthy_accounts},
          balance_by_response_time = ${updatedConfig.balance_by_response_time},
          avoid_consecutive_same_account = ${updatedConfig.avoid_consecutive_same_account},
          track_performance_metrics = ${updatedConfig.track_performance_metrics},
          log_rotation_decisions = ${updatedConfig.log_rotation_decisions},
          updated_at = NOW()
        WHERE id = (SELECT id FROM email_rotation_config LIMIT 1)
      `;

      // Clear cache to force reload
      this.config = null;
      this.configLastLoaded = null;

      console.log("[HybridRotation] Configuration updated successfully");
    } catch (error) {
      console.error("[HybridRotation] Error updating config:", error);
      throw error;
    }
  }

  /**
   * 🎲 Select provider type (SMTP vs API) based on configuration
   */
  private selectProviderType(config: HybridRotationConfig): ProviderType {
    if (!config.include_api_providers) {
      return "smtp";
    }

    // If we want to avoid consecutive same type and last was API, prefer SMTP
    if (
      config.avoid_consecutive_same_account &&
      this.lastProviderType === "api"
    ) {
      return "smtp";
    }

    // If we want to avoid consecutive same type and last was SMTP, prefer API
    if (
      config.avoid_consecutive_same_account &&
      this.lastProviderType === "smtp"
    ) {
      return "api";
    }

    // Use balance ratio to decide
    const random = Math.random();

    if (config.prefer_api_over_smtp) {
      // If prefer API, use ratio directly (higher ratio = more API)
      return random < config.api_smtp_balance_ratio ? "api" : "smtp";
    } else {
      // If prefer SMTP, inverse the ratio
      return random < 1 - config.api_smtp_balance_ratio ? "smtp" : "api";
    }
  }

  /**
   * 📧 Get API provider and create adapter
   */
  private async getAPIProvider(
    excludeIds: string[]
  ): Promise<UnifiedEmailProvider | null> {
    try {
      const apiProvider = await this.apiRotationService.getNextProvider(
        excludeIds.map((id) => id.replace("api:", ""))
      );

      if (!apiProvider) {
        return null;
      }

      // Create or get cached adapter
      let adapter = this.apiProviderCache.get(apiProvider.id);
      if (!adapter) {
        adapter = createProviderAdapter(
          apiProvider.provider_type,
          apiProvider.name,
          apiProvider.api_key,
          apiProvider.api_secret,
          {
            ...apiProvider.provider_config,
            from_email: apiProvider.from_email,
          }
        );
        this.apiProviderCache.set(apiProvider.id, adapter);
      }

      return {
        type: "api",
        id: `api:${apiProvider.id}`,
        name: apiProvider.name,
        priority: apiProvider.priority,
        weight: apiProvider.weight,
        isHealthy: apiProvider.is_healthy,
        isActive: apiProvider.is_active,
        lastUsedAt: apiProvider.last_used_at,
        apiProvider,
        apiAdapter: adapter,
      };
    } catch (error) {
      console.error("[HybridRotation] Error getting API provider:", error);
      return null;
    }
  }

  /**
   * 📬 Get SMTP provider
   */
  private async getSMTPProvider(
    excludeIds: string[]
  ): Promise<UnifiedEmailProvider | null> {
    try {
      const smtpAccount = await this.smtpRotationService.getNextAccount(
        excludeIds.map((id) => id.replace("smtp:", ""))
      );

      if (!smtpAccount) {
        return null;
      }

      return {
        type: "smtp",
        id: `smtp:${smtpAccount.id}`,
        name: smtpAccount.name,
        priority: smtpAccount.priority,
        weight: smtpAccount.weight,
        isHealthy: smtpAccount.is_healthy,
        isActive: smtpAccount.is_active,
        lastUsedAt: smtpAccount.last_used_at,
        smtpAccount,
      };
    } catch (error) {
      console.error("[HybridRotation] Error getting SMTP provider:", error);
      return null;
    }
  }

  /**
   * 🆘 Get fallback provider when hybrid rotation fails
   */
  private async getFallbackProvider(): Promise<UnifiedEmailProvider | null> {
    try {
      // Try API providers first
      const apiProvider = await this.getAPIProvider([]);
      if (apiProvider) return apiProvider;

      // Then try SMTP
      const smtpProvider = await this.getSMTPProvider([]);
      if (smtpProvider) return smtpProvider;

      return null;
    } catch (error) {
      console.error("[HybridRotation] Error getting fallback provider:", error);
      return null;
    }
  }

  /**
   * 🔧 Load configuration from database
   */
  private async loadConfig(): Promise<HybridRotationConfig> {
    // Use cached config if still valid
    if (
      this.config &&
      this.configLastLoaded &&
      Date.now() - this.configLastLoaded.getTime() < this.CONFIG_CACHE_TTL_MS
    ) {
      return this.config;
    }

    try {
      const [config] = await this.sql`
        SELECT * FROM email_rotation_config
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!config) {
        // Return default config
        const defaultConfig: HybridRotationConfig = {
          enabled: false,
          include_api_providers: false,
          strategy: "round_robin",
          api_smtp_balance_ratio: 0.5,
          prefer_api_over_smtp: true,
          api_fallback_to_smtp: true,
          smtp_fallback_to_api: true,
          emergency_fallback_enabled: true,
          max_retry_attempts: 3,
          retry_delay_seconds: 30,
          failure_cooldown_minutes: 30,
          prefer_healthy_accounts: true,
          balance_by_response_time: false,
          avoid_consecutive_same_account: true,
          track_performance_metrics: true,
          log_rotation_decisions: false,
        };

        this.config = defaultConfig;
        this.configLastLoaded = new Date();
        return defaultConfig;
      }

      const hybridConfig: HybridRotationConfig = {
        enabled: config.enabled || false,
        include_api_providers: config.include_api_providers || false,
        strategy: config.strategy || "round_robin",
        api_smtp_balance_ratio:
          parseFloat(config.api_smtp_balance_ratio) || 0.5,
        prefer_api_over_smtp: config.prefer_api_over_smtp !== false,
        api_fallback_to_smtp: config.api_fallback_to_smtp !== false,
        smtp_fallback_to_api: config.smtp_fallback_to_api !== false,
        emergency_fallback_enabled: config.emergency_fallback_enabled !== false,
        max_retry_attempts: config.max_retry_attempts || 3,
        retry_delay_seconds: config.retry_delay_seconds || 30,
        failure_cooldown_minutes: config.failure_cooldown_minutes || 30,
        prefer_healthy_accounts: config.prefer_healthy_accounts !== false,
        balance_by_response_time: config.balance_by_response_time || false,
        avoid_consecutive_same_account:
          config.avoid_consecutive_same_account !== false,
        track_performance_metrics: config.track_performance_metrics !== false,
        log_rotation_decisions: config.log_rotation_decisions || false,
      };

      this.config = hybridConfig;
      this.configLastLoaded = new Date();
      return hybridConfig;
    } catch (error) {
      console.error("[HybridRotation] Error loading config:", error);

      // Return safe defaults on error
      const defaultConfig: HybridRotationConfig = {
        enabled: false,
        include_api_providers: false,
        strategy: "round_robin",
        api_smtp_balance_ratio: 0.5,
        prefer_api_over_smtp: true,
        api_fallback_to_smtp: true,
        smtp_fallback_to_api: true,
        emergency_fallback_enabled: true,
        max_retry_attempts: 3,
        retry_delay_seconds: 30,
        failure_cooldown_minutes: 30,
        prefer_healthy_accounts: true,
        balance_by_response_time: false,
        avoid_consecutive_same_account: true,
        track_performance_metrics: true,
        log_rotation_decisions: false,
      };

      return defaultConfig;
    }
  }

  /**
   * 🧹 Cleanup and maintenance
   */
  async performMaintenance(): Promise<void> {
    try {
      // Clear adapter cache periodically
      if (this.apiProviderCache.size > 50) {
        this.apiProviderCache.clear();
      }

      // Run maintenance on sub-services
      await Promise.all([
        this.apiRotationService.resetCounters(),
        this.apiRotationService.cleanup(),
      ]);

      console.log("[HybridRotation] Maintenance completed");
    } catch (error) {
      console.error("[HybridRotation] Maintenance error:", error);
    }
  }
}

/**
 * 🏭 Factory function to create HybridEmailRotationService
 */
export function createHybridEmailRotationService(
  sql: any
): HybridEmailRotationService {
  const smtpRotationService = new SMTPRotationService(sql);
  const apiRotationService = new EmailAPIRotationService(sql);

  return new HybridEmailRotationService(
    smtpRotationService,
    apiRotationService,
    sql
  );
}
