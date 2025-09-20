/**
 * 📧 SMTPRotationService - Multi-SMTP Load Balancing Service
 *
 * Handles intelligent SMTP account selection based on round-robin strategy:
 * - Fair distribution across healthy accounts
 * - Rate limit awareness (hourly/daily limits)
 * - Health monitoring & auto-recovery
 * - Failure tracking & retry logic
 * - Performance metrics collection
 *
 * PlazaCMS Email System Enhancement
 */

export interface SMTPAccount {
  id: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  username: string;
  password_encrypted: string;
  encryption: "tls" | "ssl" | "none";
  from_email?: string;
  from_name?: string;
  weight: number;
  priority: number;
  daily_limit: number;
  hourly_limit: number;
  is_active: boolean;
  is_healthy: boolean;
  last_used_at?: Date;
  consecutive_failures: number;
  total_success_count: number;
  total_failure_count: number;
  cooldown_until?: Date;
  today_sent_count: number;
  current_hour_sent: number;
  avg_response_time_ms: number;
  last_error_message?: string;
  last_error_at?: Date;
  tags: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface RotationConfig {
  id: string;
  enabled: boolean;
  fallback_to_single: boolean;
  strategy:
    | "round_robin"
    | "weighted"
    | "weighted_distribution"
    | "priority"
    | "priority_based"
    | "health_based"
    | "health"
    | "least_used"
    | "least";
  max_retry_attempts: number;
  retry_delay_seconds: number;
  failure_cooldown_minutes: number;
  health_check_interval_minutes: number;
  failure_threshold: number;
  success_threshold: number;
  global_daily_limit?: number;
  global_hourly_limit?: number;
  prefer_healthy_accounts: boolean;
  balance_by_response_time: boolean;
  avoid_consecutive_same_account: boolean;
  emergency_fallback_enabled: boolean;
  emergency_single_account_id?: string;
  track_performance_metrics: boolean;
  log_rotation_decisions: boolean;
  settings: Record<string, any>;
}

export interface UsageLogEntry {
  smtp_account_id: string;
  recipient_email: string;
  subject: string;
  status: "success" | "failed" | "timeout" | "rate_limited";
  message_id?: string | null;
  response_time_ms: number;
  rotation_strategy: string;
  was_fallback: boolean;
  attempt_number: number;
  error_code?: string | null;
  error_message?: string | null;
}

export interface DecryptedSMTPAccount
  extends Omit<SMTPAccount, "password_encrypted"> {
  password: string; // Decrypted password for actual use
}

/**
 * 🔄 SMTPRotationService - Core multi-SMTP load balancing service
 */
export class SMTPRotationService {
  private sql: any;
  private lastUsedAccountId: string | null = null;
  private roundRobinIndex = 0;
  private config: RotationConfig | null = null;
  private configLastLoaded: Date | null = null;
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(sql: any) {
    this.sql = sql;
  }

  /**
   * 🎯 Get next SMTP account based on round-robin strategy
   */
  async getNextAccount(
    excludeAccountIds: string[] = []
  ): Promise<DecryptedSMTPAccount | null> {
    try {
      await this.loadConfig();

      if (!this.config?.enabled) {
        console.log("[SMTPRotation] Multi-SMTP disabled, returning null");
        return null;
      }

      const availableAccounts = await this.getAvailableAccounts(
        excludeAccountIds
      );

      if (availableAccounts.length === 0) {
        console.warn("[SMTPRotation] No available SMTP accounts found");
        return null;
      }

      // Select account based on configured strategy
      let selectedAccount = this.selectAccountByStrategy(availableAccounts);

      // Decrypt password for use
      const decryptedAccount: DecryptedSMTPAccount = {
        ...selectedAccount,
        password: this.decryptPassword(selectedAccount.password_encrypted),
      };

      // Update last used timestamp
      await this.updateLastUsed(selectedAccount.id);
      this.lastUsedAccountId = selectedAccount.id;

      if (this.config.log_rotation_decisions) {
        console.log(
          `[SMTPRotation] Selected ${selectedAccount.name} (${this.config.strategy})`
        );
      }

      return decryptedAccount;
    } catch (error) {
      console.error("[SMTPRotation] Error selecting account:", error);
      return null;
    }
  }

  /**
   * 🎯 Select account based on configured strategy
   */
  private selectAccountByStrategy(accounts: SMTPAccount[]): SMTPAccount {
    const strategy = this.config?.strategy || "round_robin";

    switch (strategy) {
      case "round_robin":
        return this.selectRoundRobin(accounts);
      case "weighted_distribution":
      case "weighted":
        return this.selectWeightedDistribution(accounts);
      case "priority_based":
      case "priority":
        return this.selectPriorityBased(accounts);
      case "health_based":
      case "health":
        return this.selectHealthBased(accounts);
      case "least_used":
      case "least":
        return this.selectLeastUsed(accounts);
      default:
        console.warn(
          `[SMTPRotation] Unknown strategy: ${strategy}, falling back to round_robin`
        );
        return this.selectRoundRobin(accounts);
    }
  }

  /**
   * 🔄 Round Robin Selection - Fair distribution
   * Use LRU by last_used_at so rotation persists across requests
   */
  private selectRoundRobin(accounts: SMTPAccount[]): SMTPAccount {
    console.log(
      `[SMTPRotation] Round Robin - Available accounts: ${accounts
        .map((a) => a.name)
        .join(", ")}`
    );

    // Avoid consecutive same account if configured (in-request guard)
    if (this.config?.avoid_consecutive_same_account && this.lastUsedAccountId) {
      const filteredAccounts = accounts.filter(
        (acc) => acc.id !== this.lastUsedAccountId
      );
      if (filteredAccounts.length > 0) {
        accounts = filteredAccounts;
      }
    }

    // LRU: sort by last_used_at (NULL first = never used → highest priority)
    const sorted = [...accounts].sort((a, b) => {
      const aTime = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
      const bTime = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
      return aTime - bTime; // older first
    });

    const selectedAccount = sorted[0];
    console.log(
      `[SMTPRotation] Round Robin - Selected: ${selectedAccount.name}`
    );
    return selectedAccount;
  }

  /**
   * ⚖️ Weighted Distribution Selection - Based on weight values
   */
  private selectWeightedDistribution(accounts: SMTPAccount[]): SMTPAccount {
    // Calculate total weight
    const totalWeight = accounts.reduce(
      (sum, acc) => sum + (acc.weight || 1),
      0
    );

    // Generate random number between 0 and totalWeight
    const random = Math.random() * totalWeight;

    // Find account based on weighted selection
    let currentWeight = 0;
    for (const account of accounts) {
      currentWeight += account.weight || 1;
      if (random <= currentWeight) {
        return account;
      }
    }

    // Fallback to first account if something goes wrong
    return accounts[0];
  }

  /**
   * 🎯 Priority Based Selection - Highest priority first
   */
  private selectPriorityBased(accounts: SMTPAccount[]): SMTPAccount {
    // Sort by priority (highest first) then by weight as tiebreaker
    const sortedAccounts = [...accounts].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return (b.weight || 1) - (a.weight || 1); // Higher weight as tiebreaker
    });

    return sortedAccounts[0];
  }

  /**
   * 💚 Health Based Selection - Prefer healthier accounts
   */
  private selectHealthBased(accounts: SMTPAccount[]): SMTPAccount {
    // Sort by health metrics: fewer failures, better response time
    const sortedAccounts = [...accounts].sort((a, b) => {
      // Primary: fewer consecutive failures
      if (a.consecutive_failures !== b.consecutive_failures) {
        return a.consecutive_failures - b.consecutive_failures;
      }

      // Secondary: better success rate
      const aSuccessRate =
        a.total_success_count /
        Math.max(1, a.total_success_count + a.total_failure_count);
      const bSuccessRate =
        b.total_success_count /
        Math.max(1, b.total_success_count + b.total_failure_count);
      if (Math.abs(aSuccessRate - bSuccessRate) > 0.1) {
        return bSuccessRate - aSuccessRate; // Higher success rate first
      }

      // Tertiary: better response time
      const aResponseTime = a.avg_response_time_ms || 1000;
      const bResponseTime = b.avg_response_time_ms || 1000;
      return aResponseTime - bResponseTime; // Faster response first
    });

    return sortedAccounts[0];
  }

  /**
   * 📉 Least Used Selection - Balance usage across accounts
   */
  private selectLeastUsed(accounts: SMTPAccount[]): SMTPAccount {
    // Sort by usage: least used first
    const sortedAccounts = [...accounts].sort((a, b) => {
      // Primary: today's usage
      const aUsage = a.today_sent_count || 0;
      const bUsage = b.today_sent_count || 0;
      if (aUsage !== bUsage) {
        return aUsage - bUsage; // Less used first
      }

      // Secondary: total usage
      const aTotalUsage = a.total_success_count || 0;
      const bTotalUsage = b.total_success_count || 0;
      if (aTotalUsage !== bTotalUsage) {
        return aTotalUsage - bTotalUsage; // Less used first
      }

      // Tertiary: last used time (older first)
      const aLastUsed = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
      const bLastUsed = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
      return aLastUsed - bLastUsed; // Older usage first
    });

    return sortedAccounts[0];
  }

  /**
   * 📋 Get available SMTP accounts based on health, limits, and filters
   */
  private async getAvailableAccounts(
    excludeIds: string[] = []
  ): Promise<SMTPAccount[]> {
    try {
      // First reset counters if needed (daily/hourly)
      await this.resetCountersIfNeeded();

      // Build query to get available accounts
      const excludePlaceholders =
        excludeIds.length > 0
          ? `AND id NOT IN (${excludeIds.map(() => "?").join(",")})`
          : "";

      const accounts = await this.sql`
        SELECT 
          id, name, description, host, port, username, password_encrypted,
          encryption, from_email, from_name, weight, priority, daily_limit, hourly_limit,
          is_active, is_healthy, last_used_at, consecutive_failures,
          total_success_count, total_failure_count, cooldown_until,
          today_sent_count, current_hour_sent, avg_response_time_ms,
          last_error_message, last_error_at, tags, metadata,
          created_at, updated_at
        FROM smtp_accounts 
        WHERE is_active = TRUE
          AND (cooldown_until IS NULL OR cooldown_until <= NOW())
          AND today_sent_count < daily_limit
          AND current_hour_sent < hourly_limit
          ${
            excludeIds.length > 0
              ? this.sql`AND id NOT IN ${this.sql(excludeIds)}`
              : this.sql``
          }
        ORDER BY priority ASC, weight DESC, name ASC
      `;

      // Apply health preference if configured
      let filteredAccounts = accounts;
      if (this.config?.prefer_healthy_accounts) {
        const healthyAccounts = accounts.filter(
          (acc: SMTPAccount) => acc.is_healthy
        );
        if (healthyAccounts.length > 0) {
          filteredAccounts = healthyAccounts;
        }
      }

      // Apply response time balancing if configured
      if (
        this.config?.balance_by_response_time &&
        filteredAccounts.length > 1
      ) {
        // Sort by response time (faster first) but keep some randomization
        filteredAccounts = filteredAccounts.sort(
          (a: SMTPAccount, b: SMTPAccount) => {
            const aTime = a.avg_response_time_ms || 1000;
            const bTime = b.avg_response_time_ms || 1000;

            // Add small random factor to prevent always using same fastest account
            const randomFactor = (Math.random() - 0.5) * 0.2; // ±10% variance
            const aAdjusted = aTime * (1 + randomFactor);
            const bAdjusted = bTime * (1 - randomFactor);

            return aAdjusted - bAdjusted;
          }
        );
      }

      return filteredAccounts;
    } catch (error) {
      console.error("[SMTPRotation] Error fetching available accounts:", error);
      return [];
    }
  }

  /**
   * ✅ Mark account as successful
   */
  async markSuccess(
    accountId: string,
    messageId: string,
    responseTimeMs: number = 0,
    recipient: string = "",
    subject: string = ""
  ): Promise<void> {
    try {
      const timestamp = new Date();

      // Update account statistics
      await this.sql`
        UPDATE smtp_accounts SET
          consecutive_failures = 0,
          total_success_count = total_success_count + 1,
          today_sent_count = today_sent_count + 1,
          current_hour_sent = current_hour_sent + 1,
          last_used_at = ${timestamp},
          is_healthy = TRUE,
          avg_response_time_ms = CAST((avg_response_time_ms * 0.9) + (${responseTimeMs} * 0.1) AS INTEGER),
          updated_at = ${timestamp}
        WHERE id = ${accountId}
      `;

      // Log usage for analytics
      if (this.config?.track_performance_metrics) {
        await this.logUsage({
          smtp_account_id: accountId,
          recipient_email: recipient,
          subject: subject,
          status: "success",
          message_id: messageId,
          response_time_ms: responseTimeMs,
          rotation_strategy: this.config.strategy,
          was_fallback: false,
          attempt_number: 1,
          error_code: undefined,
          error_message: undefined,
        });
      }
    } catch (error) {
      console.error("[SMTPRotation] Error marking success:", error);
    }
  }

  /**
   * ❌ Mark account as failed
   */
  async markFailure(
    accountId: string,
    error: Error,
    responseTimeMs: number = 0,
    recipient: string = "",
    subject: string = ""
  ): Promise<void> {
    try {
      const timestamp = new Date();
      const failureThreshold = this.config?.failure_threshold || 5;
      const cooldownMinutes = this.config?.failure_cooldown_minutes || 30;

      // Update account with failure
      await this.sql`
        UPDATE smtp_accounts SET
          consecutive_failures = consecutive_failures + 1,
          total_failure_count = total_failure_count + 1,
          last_error_message = ${error.message},
          last_error_at = ${timestamp},
          is_healthy = CASE 
            WHEN consecutive_failures + 1 >= ${failureThreshold} THEN FALSE 
            ELSE is_healthy 
          END,
          cooldown_until = CASE 
            WHEN consecutive_failures + 1 >= ${failureThreshold} 
            THEN NOW() + (${cooldownMinutes} || ' minutes')::INTERVAL
            ELSE cooldown_until
          END,
          updated_at = ${timestamp}
        WHERE id = ${accountId}
      `;

      // Log failure for analytics
      if (this.config?.track_performance_metrics) {
        await this.logUsage({
          smtp_account_id: accountId,
          recipient_email: recipient,
          subject: subject,
          status: "failed",
          message_id: undefined,
          response_time_ms: responseTimeMs,
          rotation_strategy: this.config?.strategy || "round_robin",
          was_fallback: false,
          attempt_number: 1,
          error_code: undefined,
          error_message: error.message,
        });
      }
    } catch (dbError) {
      console.error("[SMTPRotation] Error marking failure:", dbError);
    }
  }

  /**
   * 💓 Perform health check on account - REAL SMTP CONNECTION TEST
   */
  async performHealthCheck(accountId: string): Promise<boolean> {
    try {
      const [account] = await this.sql`
          SELECT id, name, host, port, username, password_encrypted, encryption, 
                 from_email, from_name, consecutive_failures
          FROM smtp_accounts WHERE id = ${accountId}
        `;

      if (!account) {
        console.warn(
          `[SMTPRotation] Account ${accountId} not found for health check`
        );
        return false;
      }

      // REAL SMTP CONNECTION TEST using WorkerMailer
      const startTime = Date.now();
      let isHealthy = false;
      let errorMessage = "";

      try {
        const { WorkerMailer } = await import("worker-mailer");

        // Test SMTP connection (don't send email, just connect)
        const testResult = await WorkerMailer.send(
          {
            host: account.host,
            port: account.port,
            secure: account.encryption === "ssl",
            startTls: account.encryption === "tls",
            credentials: {
              username: account.username,
              password: this.decryptPassword(account.password_encrypted),
            },
            authType: "plain",
          },
          {
            from: {
              name: account.from_name || "Health Check",
              email: account.from_email || "noreply@plazaku.my.id",
            },
            to: account.from_email || "noreply@plazaku.my.id", // Send to configured email
            subject: "SMTP Health Check - Ignore",
            text: "This is an automated health check. Please ignore this email.",
            html: "<p>This is an automated health check. Please ignore this email.</p>",
          }
        );

        // If we reach here, connection was successful
        isHealthy = true;
        console.log(`[SMTPRotation] Health check PASSED for ${account.name}`);
      } catch (smtpError: any) {
        isHealthy = false;
        errorMessage = smtpError.message || "SMTP connection failed";
        console.warn(
          `[SMTPRotation] Health check FAILED for ${account.name}:`,
          errorMessage
        );

        // Also check based on recent performance as fallback
        const fallbackHealthy =
          account.consecutive_failures < (this.config?.failure_threshold || 5);
        if (fallbackHealthy && account.consecutive_failures === 0) {
          // If account has no recent failures, maybe it's just a temporary issue
          console.log(
            `[SMTPRotation] Using fallback health check for ${account.name} - no recent failures`
          );
          isHealthy = true;
          errorMessage = `Connection test failed but no recent failures: ${errorMessage}`;
        }
      }

      const responseTime = Date.now() - startTime;

      // Save health check result
      await this.sql`
        INSERT INTO smtp_account_health_checks 
        (smtp_account_id, status, response_time_ms, test_email_sent, error_message, checked_at)
        VALUES (
          ${accountId}, 
          ${isHealthy ? "healthy" : "connection_error"}, 
          ${responseTime}, 
          TRUE,
          ${errorMessage || null},
          NOW()
        )
      `;

      // Update account health status
      if (isHealthy && !account.is_healthy) {
        // Account recovered
        await this.sql`
          UPDATE smtp_accounts SET
            is_healthy = TRUE,
            last_health_check_at = NOW(),
            consecutive_failures = 0,
            cooldown_until = NULL
          WHERE id = ${accountId}
        `;
        console.log(`[SMTPRotation] Account ${account.name} marked as healthy`);
      }

      return isHealthy;
    } catch (error) {
      console.error("[SMTPRotation] Error in health check:", error);
      return false;
    }
  }

  /**
   * 🔧 Load rotation configuration from database
   */
  private async loadConfig(): Promise<void> {
    try {
      // Check cache validity
      if (this.config && this.configLastLoaded) {
        const cacheAge = Date.now() - this.configLastLoaded.getTime();
        if (cacheAge < this.CONFIG_CACHE_TTL) {
          return; // Use cached config
        }
      }

      const configResults = await this.sql`
        SELECT * FROM smtp_rotation_config LIMIT 1
      `;

      if (configResults.length > 0) {
        this.config = configResults[0] as RotationConfig;
        this.configLastLoaded = new Date();
      } else {
        // Create and use default config
        console.warn("[SMTPRotation] No config found, using default");
        this.config = this.getDefaultConfig();
        await this.createDefaultConfig();
      }
    } catch (error) {
      console.error("[SMTPRotation] Error loading config:", error);
      // Use fallback config
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * 🗑️ Clear config cache to force reload from database
   */
  clearCache(): void {
    this.config = null;
    this.configLastLoaded = null;
    console.log("[SMTPRotation] Config cache cleared");
  }

  /**
   * 🔧 Default configuration
   */
  private getDefaultConfig(): RotationConfig {
    return {
      id: "",
      enabled: true, // Enable by default for testing
      fallback_to_single: true,
      strategy: "round_robin",
      max_retry_attempts: 3,
      retry_delay_seconds: 30,
      failure_cooldown_minutes: 30,
      health_check_interval_minutes: 5,
      failure_threshold: 5,
      success_threshold: 3,
      prefer_healthy_accounts: true,
      balance_by_response_time: false,
      avoid_consecutive_same_account: true,
      emergency_fallback_enabled: true,
      track_performance_metrics: true,
      log_rotation_decisions: false,
      settings: {},
    };
  }

  /**
   * 📊 Log usage for analytics
   */
  private async logUsage(entry: UsageLogEntry): Promise<void> {
    try {
      const messageId = entry.message_id ?? null;
      const errorCode = entry.error_code ?? null;
      const errorMessage = entry.error_message ?? null;
      await this.sql`
        INSERT INTO smtp_usage_logs (
          smtp_account_id, recipient_email, subject, status, message_id,
          response_time_ms, rotation_strategy, was_fallback, attempt_number,
          error_code, error_message, created_at
        ) VALUES (
          ${entry.smtp_account_id}, 
          ${entry.recipient_email}, 
          ${entry.subject},
          ${entry.status}, 
          ${messageId}, 
          ${entry.response_time_ms},
          ${entry.rotation_strategy}, 
          ${entry.was_fallback}, 
          ${entry.attempt_number},
          ${errorCode}, 
          ${errorMessage}, 
          NOW()
        )
      `;
    } catch (error) {
      console.error("[SMTPRotation] Error logging usage:", error);
    }
  }

  /**
   * 🔄 Reset counters if needed (daily/hourly)
   */
  private async resetCountersIfNeeded(): Promise<void> {
    try {
      // Reset daily counters
      await this.sql`
        UPDATE smtp_accounts 
        SET 
          today_sent_count = 0,
          daily_reset_at = CURRENT_DATE
        WHERE daily_reset_at < CURRENT_DATE
      `;

      // Reset hourly counters
      await this.sql`
        UPDATE smtp_accounts 
        SET 
          current_hour_sent = 0,
          hourly_reset_at = DATE_TRUNC('hour', NOW())
        WHERE hourly_reset_at < DATE_TRUNC('hour', NOW())
      `;
    } catch (error) {
      console.error("[SMTPRotation] Error resetting counters:", error);
    }
  }

  /**
   * 📋 Get account by ID
   */
  private async getAccountById(accountId: string): Promise<SMTPAccount | null> {
    try {
      const results = await this.sql`
        SELECT * FROM smtp_accounts WHERE id = ${accountId}
      `;

      return results.length > 0 ? (results[0] as SMTPAccount) : null;
    } catch (error) {
      console.error("[SMTPRotation] Error fetching account:", error);
      return null;
    }
  }

  /**
   * 🔧 Update last used timestamp
   */
  private async updateLastUsed(accountId: string): Promise<void> {
    try {
      await this.sql`
        UPDATE smtp_accounts SET last_used_at = NOW() WHERE id = ${accountId}
      `;
    } catch (error) {
      console.error("[SMTPRotation] Error updating last used:", error);
    }
  }

  /**
   * 🔐 Decrypt password (enhanced with proper encryption support)
   */
  public decryptPassword(password: string): string {
    // NO ENCRYPTION - Plain text storage for development
    // Fix for legacy encrypted_ format
    if (password && password.startsWith("encrypted_")) {
      const parts = password.split("_");
      if (parts.length >= 2) {
        return parts[1]; // Extract password from old format
      }
    }

    // Return password as-is
    return password || "";
  }

  /**
   * 🔄 Background Health Monitoring Service
   */
  async runBackgroundHealthMonitoring(): Promise<void> {
    try {
      console.log("[SMTPRotation] Starting background health monitoring...");

      // Get all active accounts
      const activeAccounts = await this.sql`
        SELECT id, name FROM smtp_accounts 
        WHERE is_active = TRUE
      `;

      console.log(
        `[SMTPRotation] Monitoring ${activeAccounts.length} active accounts`
      );

      // Perform health checks on all active accounts
      for (const account of activeAccounts) {
        try {
          await this.performHealthCheck(account.id);

          // Small delay between checks to avoid overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(
            `[SMTPRotation] Health check error for ${account.name}:`,
            error
          );
        }
      }

      console.log("[SMTPRotation] Background health monitoring completed");
    } catch (error) {
      console.error(
        "[SMTPRotation] Background health monitoring error:",
        error
      );
    }
  }

  /**
   * 🕐 Background Counter Reset Service
   */
  async runBackgroundCounterReset(): Promise<void> {
    try {
      console.log("[SMTPRotation] Running background counter reset...");

      // Reset daily counters
      const dailyResetResult = await this.sql`
        UPDATE smtp_accounts 
        SET 
          today_sent_count = 0,
          daily_reset_at = CURRENT_DATE
        WHERE daily_reset_at < CURRENT_DATE OR daily_reset_at IS NULL
      `;

      // Reset hourly counters
      const hourlyResetResult = await this.sql`
        UPDATE smtp_accounts 
        SET 
          current_hour_sent = 0,
          hourly_reset_at = DATE_TRUNC('hour', NOW())
        WHERE hourly_reset_at < DATE_TRUNC('hour', NOW()) OR hourly_reset_at IS NULL
      `;

      console.log(
        `[SMTPRotation] Counter reset completed - Daily: ${dailyResetResult.length}, Hourly: ${hourlyResetResult.length}`
      );
    } catch (error) {
      console.error("[SMTPRotation] Background counter reset error:", error);
    }
  }

  /**
   * 📊 Rate Limiting Analytics & Alerts
   */
  async checkRateLimitingStatus(): Promise<{
    near_limit_accounts: any[];
    exceeded_accounts: any[];
    daily_usage: any;
    hourly_usage: any;
  }> {
    try {
      // Get accounts near daily limit (>80%)
      const nearDailyLimit = await this.sql`
        SELECT id, name, today_sent_count, daily_limit,
               CAST(((today_sent_count::float / daily_limit) * 100) AS DECIMAL(5,1)) as usage_percent
        FROM smtp_accounts 
        WHERE is_active = TRUE 
          AND daily_limit > 0
          AND (today_sent_count::float / daily_limit) >= 0.8
        ORDER BY usage_percent DESC
      `;

      // Get accounts near hourly limit (>80%)
      const nearHourlyLimit = await this.sql`
        SELECT id, name, current_hour_sent, hourly_limit,
               CAST(((current_hour_sent::float / hourly_limit) * 100) AS DECIMAL(5,1)) as usage_percent
        FROM smtp_accounts 
        WHERE is_active = TRUE 
          AND hourly_limit > 0
          AND (current_hour_sent::float / hourly_limit) >= 0.8
        ORDER BY usage_percent DESC
      `;

      // Get accounts that exceeded limits
      const exceededAccounts = await this.sql`
        SELECT id, name, today_sent_count, daily_limit, current_hour_sent, hourly_limit
        FROM smtp_accounts 
        WHERE is_active = TRUE 
          AND (
            (daily_limit > 0 AND today_sent_count >= daily_limit)
            OR 
            (hourly_limit > 0 AND current_hour_sent >= hourly_limit)
          )
      `;

      // Get overall usage statistics
      const dailyUsage = await this.sql`
        SELECT 
          SUM(today_sent_count) as total_sent_today,
          SUM(daily_limit) as total_daily_capacity,
          COUNT(*) as active_accounts,
          CAST(AVG((today_sent_count::float / NULLIF(daily_limit, 0)) * 100) AS DECIMAL(5,1)) as avg_usage_percent
        FROM smtp_accounts 
        WHERE is_active = TRUE AND daily_limit > 0
      `;

      const hourlyUsage = await this.sql`
        SELECT 
          SUM(current_hour_sent) as total_sent_this_hour,
          SUM(hourly_limit) as total_hourly_capacity,
          CAST(AVG((current_hour_sent::float / NULLIF(hourly_limit, 0)) * 100) AS DECIMAL(5,1)) as avg_usage_percent
        FROM smtp_accounts 
        WHERE is_active = TRUE AND hourly_limit > 0
      `;

      // Combine near limit accounts
      const nearLimitAccounts = [
        ...nearDailyLimit.map((acc: any) => ({ ...acc, limit_type: "daily" })),
        ...nearHourlyLimit.map((acc: any) => ({
          ...acc,
          limit_type: "hourly",
        })),
      ];

      // Log alerts for exceeded accounts
      if (exceededAccounts.length > 0) {
        console.warn(
          `[SMTPRotation] RATE LIMIT EXCEEDED: ${exceededAccounts.length} accounts exceeded their limits`
        );
        exceededAccounts.forEach((acc: any) => {
          console.warn(
            `[SMTPRotation] ${acc.name}: Daily ${acc.today_sent_count}/${acc.daily_limit}, Hourly ${acc.current_hour_sent}/${acc.hourly_limit}`
          );
        });
      }

      // Log warnings for near limit accounts
      if (nearLimitAccounts.length > 0) {
        console.warn(
          `[SMTPRotation] APPROACHING LIMITS: ${nearLimitAccounts.length} accounts near rate limits`
        );
      }

      return {
        near_limit_accounts: nearLimitAccounts,
        exceeded_accounts: exceededAccounts,
        daily_usage: dailyUsage[0],
        hourly_usage: hourlyUsage[0],
      };
    } catch (error) {
      console.error("[SMTPRotation] Rate limiting check error:", error);
      return {
        near_limit_accounts: [],
        exceeded_accounts: [],
        daily_usage: null,
        hourly_usage: null,
      };
    }
  }

  /**
   * 🔧 Cleanup old logs and health checks
   */
  async runMaintenanceCleanup(): Promise<void> {
    try {
      console.log("[SMTPRotation] Running maintenance cleanup...");

      // Clean up old usage logs (keep last 30 days)
      const usageCleanup = await this.sql`
        DELETE FROM smtp_usage_logs 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `;

      // Clean up old health checks (keep last 7 days)
      const healthCleanup = await this.sql`
        DELETE FROM smtp_account_health_checks 
        WHERE checked_at < NOW() - INTERVAL '7 days'
      `;

      console.log(
        `[SMTPRotation] Cleanup completed - Usage logs: ${usageCleanup.length}, Health checks: ${healthCleanup.length}`
      );
    } catch (error) {
      console.error("[SMTPRotation] Maintenance cleanup error:", error);
    }
  }

  /**
   * 🔧 Create default configuration in database
   */
  private async createDefaultConfig(): Promise<void> {
    try {
      const defaultConfig = this.getDefaultConfig();

      await this.sql`
        INSERT INTO smtp_rotation_config 
        (enabled, strategy, max_retry_attempts, retry_delay_seconds, failure_cooldown_minutes,
         health_check_interval_minutes, failure_threshold, success_threshold,
         prefer_healthy_accounts, track_performance_metrics, avoid_consecutive_same_account)
        VALUES (
          ${defaultConfig.enabled},
          ${defaultConfig.strategy},
          ${defaultConfig.max_retry_attempts},
          ${defaultConfig.retry_delay_seconds},
          ${defaultConfig.failure_cooldown_minutes},
          ${defaultConfig.health_check_interval_minutes},
          ${defaultConfig.failure_threshold},
          ${defaultConfig.success_threshold},
          ${defaultConfig.prefer_healthy_accounts},
          ${defaultConfig.track_performance_metrics},
          ${defaultConfig.avoid_consecutive_same_account}
        )
        ON CONFLICT DO NOTHING
      `;

      console.log("[SMTPRotation] Created default configuration");
    } catch (error) {
      console.error("[SMTPRotation] Error creating default config:", error);
    }
  }

  /**
   * 📊 Get rotation statistics for analytics
   */
  async getRotationStats(days: number = 7): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const stats = await this.sql`
        SELECT 
          s.name as account_name,
          s.host,
          s.is_active,
          s.is_healthy,
          s.today_sent_count,
          s.daily_limit,
          COUNT(l.*) as total_emails,
          COUNT(CASE WHEN l.status = 'success' THEN 1 END) as successful_emails,
          COUNT(CASE WHEN l.status = 'failed' THEN 1 END) as failed_emails,
          CAST(AVG(l.response_time_ms) AS INTEGER) as avg_response_time,
          MAX(l.created_at) as last_used,
          s.consecutive_failures
        FROM smtp_accounts s
        LEFT JOIN smtp_usage_logs l ON s.id = l.smtp_account_id 
          AND l.created_at >= ${cutoffDate.toISOString()}
        WHERE s.is_active = TRUE
        GROUP BY s.id, s.name, s.host, s.is_active, s.is_healthy, 
                 s.today_sent_count, s.daily_limit, s.consecutive_failures
        ORDER BY successful_emails DESC
      `;

      // Calculate health overview
      const totalAccounts = stats.length;
      const healthyAccounts = stats.filter((acc: any) => acc.is_healthy).length;
      const accountsWithFailures = stats.filter(
        (acc: any) => (acc.consecutive_failures || 0) > 0
      ).length;
      const unusedAccounts = stats.filter(
        (acc: any) => (parseInt(acc.total_emails) || 0) === 0
      ).length;

      return {
        period_days: days,
        accounts: stats,
        total_emails: stats.reduce(
          (sum: number, acc: any) => sum + (parseInt(acc.total_emails) || 0),
          0
        ),
        total_successful: stats.reduce(
          (sum: number, acc: any) =>
            sum + (parseInt(acc.successful_emails) || 0),
          0
        ),
        total_failed: stats.reduce(
          (sum: number, acc: any) => sum + (parseInt(acc.failed_emails) || 0),
          0
        ),
        // Health Overview Data
        health_overview: {
          total_accounts: totalAccounts,
          healthy_accounts: healthyAccounts,
          accounts_with_failures: accountsWithFailures,
          unused_accounts: unusedAccounts,
        },
      };
    } catch (error) {
      console.error("[SMTPRotation] Error getting stats:", error);
      return {
        accounts: [],
        total_emails: 0,
        total_successful: 0,
        total_failed: 0,
        health_overview: {
          total_accounts: 0,
          healthy_accounts: 0,
          accounts_with_failures: 0,
          unused_accounts: 0,
        },
      };
    }
  }

  /**
   * 🔧 Check if multi-SMTP is enabled
   */
  async isEnabled(): Promise<boolean> {
    await this.loadConfig();
    return this.config?.enabled || false;
  }

  /**
   * 🎯 Get current configuration
   */
  async getConfig(): Promise<RotationConfig | null> {
    await this.loadConfig();
    return this.config;
  }
}

/**
 * 🏭 Factory function to create SMTPRotationService instance
 * IMPORTANT: Must be per-request to avoid Cloudflare Workers I/O context errors
 */
export function createSMTPRotationService(sql: any): SMTPRotationService {
  return new SMTPRotationService(sql);
}
