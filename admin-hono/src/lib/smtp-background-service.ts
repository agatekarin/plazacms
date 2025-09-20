/**
 * 🔄 SMTP Background Services Scheduler
 * PlazaCMS Multi-SMTP Background Monitoring & Maintenance
 *
 * Handles:
 * - Periodic health checks for all SMTP accounts
 * - Automatic rate limiting counter resets
 * - Rate limit monitoring and alerts
 * - Database maintenance and cleanup
 * - Auto-recovery for unhealthy accounts
 *
 * Services run on configurable intervals via Cloudflare Workers Cron
 */

import { createSMTPRotationService } from "./smtp-rotation-service";
import { getDb } from "./db";

interface BackgroundServiceConfig {
  healthCheckInterval: number; // minutes
  counterResetInterval: number; // minutes
  rateLimitCheckInterval: number; // minutes
  cleanupInterval: number; // hours
  enabled: boolean;
}

export class SMTPBackgroundService {
  private config: BackgroundServiceConfig;
  private sql: any;
  private rotationService: any;
  private timers: Map<string, any> = new Map();

  constructor(sql: any, config?: Partial<BackgroundServiceConfig>) {
    this.sql = sql;
    this.rotationService = createSMTPRotationService(sql);

    // Default configuration
    this.config = {
      healthCheckInterval: 5, // Every 5 minutes
      counterResetInterval: 15, // Every 15 minutes (check for resets)
      rateLimitCheckInterval: 10, // Every 10 minutes
      cleanupInterval: 24 * 60, // Every 24 hours
      enabled: true,
      ...config,
    };
  }

  /**
   * 🚀 Start all background services
   */
  async startServices(): Promise<void> {
    if (!this.config.enabled) {
      console.log("[SMTPBackgroundService] Background services disabled");
      return;
    }

    console.log("[SMTPBackgroundService] Starting background services...");

    try {
      // Start health monitoring service
      await this.startHealthMonitoring();

      // Start counter reset service
      await this.startCounterResetService();

      // Start rate limit monitoring
      await this.startRateLimitMonitoring();

      // Start cleanup service
      await this.startCleanupService();

      console.log(
        "[SMTPBackgroundService] All background services started successfully"
      );
    } catch (error) {
      console.error("[SMTPBackgroundService] Error starting services:", error);
      throw error;
    }
  }

  /**
   * 🛑 Stop all background services
   */
  stopServices(): void {
    console.log("[SMTPBackgroundService] Stopping background services...");

    // Clear all timers
    for (const [serviceName, timer] of this.timers) {
      clearInterval(timer);
      console.log(`[SMTPBackgroundService] Stopped ${serviceName} service`);
    }

    this.timers.clear();
    console.log("[SMTPBackgroundService] All background services stopped");
  }

  /**
   * 💓 Start Health Monitoring Service
   */
  private async startHealthMonitoring(): Promise<void> {
    const intervalMs = this.config.healthCheckInterval * 60 * 1000;

    // Run immediately on startup
    await this.runHealthCheck();

    // Schedule recurring checks
    const timer = setInterval(async () => {
      await this.runHealthCheck();
    }, intervalMs);

    this.timers.set("healthMonitoring", timer);
    console.log(
      `[SMTPBackgroundService] Health monitoring started (interval: ${this.config.healthCheckInterval}m)`
    );
  }

  /**
   * 🕐 Start Counter Reset Service
   */
  private async startCounterResetService(): Promise<void> {
    const intervalMs = this.config.counterResetInterval * 60 * 1000;

    // Run immediately on startup
    await this.runCounterReset();

    // Schedule recurring resets
    const timer = setInterval(async () => {
      await this.runCounterReset();
    }, intervalMs);

    this.timers.set("counterReset", timer);
    console.log(
      `[SMTPBackgroundService] Counter reset started (interval: ${this.config.counterResetInterval}m)`
    );
  }

  /**
   * 📊 Start Rate Limit Monitoring
   */
  private async startRateLimitMonitoring(): Promise<void> {
    const intervalMs = this.config.rateLimitCheckInterval * 60 * 1000;

    // Run immediately on startup
    await this.runRateLimitCheck();

    // Schedule recurring checks
    const timer = setInterval(async () => {
      await this.runRateLimitCheck();
    }, intervalMs);

    this.timers.set("rateLimitMonitoring", timer);
    console.log(
      `[SMTPBackgroundService] Rate limit monitoring started (interval: ${this.config.rateLimitCheckInterval}m)`
    );
  }

  /**
   * 🔧 Start Cleanup Service
   */
  private async startCleanupService(): Promise<void> {
    const intervalMs = this.config.cleanupInterval * 60 * 1000;

    // Schedule recurring cleanup (don't run immediately)
    const timer = setInterval(async () => {
      await this.runCleanup();
    }, intervalMs);

    this.timers.set("cleanup", timer);
    console.log(
      `[SMTPBackgroundService] Cleanup service started (interval: ${
        this.config.cleanupInterval / 60
      }h)`
    );
  }

  /**
   * 💓 Execute Health Check
   */
  private async runHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.rotationService.runBackgroundHealthMonitoring();
      const duration = Date.now() - startTime;

      console.log(
        `[SMTPBackgroundService] Health check completed in ${duration}ms`
      );
    } catch (error) {
      console.error("[SMTPBackgroundService] Health check error:", error);
    }
  }

  /**
   * 🕐 Execute Counter Reset
   */
  private async runCounterReset(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.rotationService.runBackgroundCounterReset();
      const duration = Date.now() - startTime;

      console.log(
        `[SMTPBackgroundService] Counter reset completed in ${duration}ms`
      );
    } catch (error) {
      console.error("[SMTPBackgroundService] Counter reset error:", error);
    }
  }

  /**
   * 📊 Execute Rate Limit Check
   */
  private async runRateLimitCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const status = await this.rotationService.checkRateLimitingStatus();
      const duration = Date.now() - startTime;

      // Log summary
      if (status.exceeded_accounts.length > 0) {
        console.warn(
          `[SMTPBackgroundService] ⚠️  ${status.exceeded_accounts.length} accounts exceeded rate limits`
        );
      }

      if (status.near_limit_accounts.length > 0) {
        console.warn(
          `[SMTPBackgroundService] ⚠️  ${status.near_limit_accounts.length} accounts approaching rate limits`
        );
      }

      console.log(
        `[SMTPBackgroundService] Rate limit check completed in ${duration}ms`
      );
    } catch (error) {
      console.error("[SMTPBackgroundService] Rate limit check error:", error);
    }
  }

  /**
   * 🔧 Execute Cleanup
   */
  private async runCleanup(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.rotationService.runMaintenanceCleanup();
      const duration = Date.now() - startTime;

      console.log(`[SMTPBackgroundService] Cleanup completed in ${duration}ms`);
    } catch (error) {
      console.error("[SMTPBackgroundService] Cleanup error:", error);
    }
  }

  /**
   * 📊 Get Service Status
   */
  getServiceStatus(): {
    enabled: boolean;
    activeServices: string[];
    config: BackgroundServiceConfig;
    uptime: string;
  } {
    return {
      enabled: this.config.enabled,
      activeServices: Array.from(this.timers.keys()),
      config: this.config,
      uptime:
        typeof (globalThis as any).process?.uptime === "function"
          ? `${Math.floor((globalThis as any).process.uptime())}s`
          : "N/A",
    };
  }

  /**
   * 🔧 Update Configuration
   */
  updateConfig(newConfig: Partial<BackgroundServiceConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    console.log("[SMTPBackgroundService] Configuration updated:", {
      old: oldConfig,
      new: this.config,
    });

    // Restart services if intervals changed
    const intervalFields = [
      "healthCheckInterval",
      "counterResetInterval",
      "rateLimitCheckInterval",
      "cleanupInterval",
    ];
    const intervalsChanged = intervalFields.some(
      (field) =>
        newConfig[field as keyof BackgroundServiceConfig] &&
        newConfig[field as keyof BackgroundServiceConfig] !==
          oldConfig[field as keyof BackgroundServiceConfig]
    );

    if (intervalsChanged) {
      console.log(
        "[SMTPBackgroundService] Intervals changed, restarting services..."
      );
      this.stopServices();

      if (this.config.enabled) {
        setTimeout(() => {
          this.startServices().catch(console.error);
        }, 1000);
      }
    }
  }

  /**
   * 🧪 Manual Service Execution (for testing)
   */
  async runManualHealthCheck(): Promise<void> {
    console.log("[SMTPBackgroundService] Manual health check requested");
    await this.runHealthCheck();
  }

  async runManualCounterReset(): Promise<void> {
    console.log("[SMTPBackgroundService] Manual counter reset requested");
    await this.runCounterReset();
  }

  async runManualRateLimitCheck(): Promise<any> {
    console.log("[SMTPBackgroundService] Manual rate limit check requested");
    await this.runRateLimitCheck();
    return await this.rotationService.checkRateLimitingStatus();
  }

  async runManualCleanup(): Promise<void> {
    console.log("[SMTPBackgroundService] Manual cleanup requested");
    await this.runCleanup();
  }
}

/**
 * 🏭 Factory function to create SMTPBackgroundService
 */
export function createSMTPBackgroundService(
  c: any,
  config?: Partial<BackgroundServiceConfig>
): SMTPBackgroundService {
  const sql = getDb(c);
  return new SMTPBackgroundService(sql, config);
}

/**
 * 🎛️ Global background service instance (singleton for Cloudflare Workers)
 */
let globalBackgroundService: SMTPBackgroundService | null = null;

export function getGlobalBackgroundService(c: any): SMTPBackgroundService {
  if (!globalBackgroundService) {
    globalBackgroundService = createSMTPBackgroundService(c);
  }
  return globalBackgroundService;
}

export function startGlobalBackgroundServices(c: any): Promise<void> {
  const service = getGlobalBackgroundService(c);
  return service.startServices();
}

export function stopGlobalBackgroundServices(): void {
  if (globalBackgroundService) {
    globalBackgroundService.stopServices();
    globalBackgroundService = null;
  }
}
