/**
 * ⚙️ Email Rotation Configuration Routes
 *
 * Manages hybrid email rotation configuration settings
 * Controls balance between SMTP and API providers
 */

import { Hono } from "hono";
import { getDb } from "../lib/db";
import {
  createHybridEmailRotationService,
  HybridEmailRotationService,
} from "../lib/hybrid-email-rotation-service";

// Use proper Env type for Hono
const app = new Hono<{ Bindings: Env }>();

/**
 * 📋 Get current rotation configuration
 */
app.get("/", async (c) => {
  try {
    const sql = getDb(c);

    // Get current active configuration
    const [config] = await sql`
      SELECT * FROM email_rotation_config 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (!config) {
      return c.json({
        success: true,
        data: null,
        message: "No rotation configuration found",
      });
    }

    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error fetching config:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch rotation configuration",
      },
      500
    );
  }
});

/**
 * 📊 Get rotation statistics and status
 */
app.get("/stats", async (c) => {
  try {
    const sql = getDb(c);
    const hybridService = createHybridEmailRotationService(sql);

    const stats = await hybridService.getStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error fetching stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch rotation statistics",
      },
      500
    );
  }
});

/**
 * 📝 Update rotation configuration
 */
app.put("/", async (c) => {
  try {
    const sql = getDb(c);
    const body = await c.req.json();

    const {
      enabled,
      include_api_providers,
      strategy,
      api_smtp_balance_ratio,
      prefer_api_over_smtp,
      api_fallback_to_smtp,
      smtp_fallback_to_api,
      emergency_fallback_enabled,
      max_retry_attempts,
      retry_delay_ms,
      circuit_breaker_threshold,
      prefer_healthy_accounts,
      balance_by_response_time,
      avoid_consecutive_same_account,
      track_performance_metrics,
      log_rotation_decisions,
      notes,
    } = body;

    // Validate strategy if provided
    const validStrategies = [
      "round_robin",
      "weighted",
      "priority",
      "health_based",
      "least_used",
    ];
    if (strategy && !validStrategies.includes(strategy)) {
      return c.json(
        {
          success: false,
          error: `Invalid strategy. Must be one of: ${validStrategies.join(
            ", "
          )}`,
        },
        400
      );
    }

    // Validate balance ratio if provided
    if (api_smtp_balance_ratio !== undefined) {
      const ratio = parseFloat(api_smtp_balance_ratio);
      if (isNaN(ratio) || ratio < 0 || ratio > 1) {
        return c.json(
          {
            success: false,
            error: "api_smtp_balance_ratio must be between 0 and 1",
          },
          400
        );
      }
    }

    // Validate retry attempts if provided
    if (
      max_retry_attempts !== undefined &&
      (max_retry_attempts < 1 || max_retry_attempts > 10)
    ) {
      return c.json(
        {
          success: false,
          error: "max_retry_attempts must be between 1 and 10",
        },
        400
      );
    }

    // Get current config for comparison
    const [currentConfig] = await sql`
      SELECT * FROM email_rotation_config 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    // Build update object
    const updates: any = {};
    const updateFields: string[] = [];

    // Helper function to add field to update
    const addUpdate = (field: string, value: any, dbField?: string) => {
      if (value !== undefined) {
        const dbFieldName = dbField || field;
        updates[dbFieldName] = value;
        updateFields.push(`${dbFieldName} = \${${dbFieldName}}`);
      }
    };

    addUpdate("enabled", enabled);
    addUpdate("include_api_providers", include_api_providers);
    addUpdate("strategy", strategy);
    addUpdate("api_smtp_balance_ratio", api_smtp_balance_ratio);
    addUpdate("prefer_api_over_smtp", prefer_api_over_smtp);
    addUpdate("api_fallback_to_smtp", api_fallback_to_smtp);
    addUpdate("smtp_fallback_to_api", smtp_fallback_to_api);
    addUpdate("emergency_fallback_enabled", emergency_fallback_enabled);
    addUpdate("max_retry_attempts", max_retry_attempts);
    addUpdate("retry_delay_ms", retry_delay_ms);
    addUpdate("circuit_breaker_threshold", circuit_breaker_threshold);
    addUpdate("prefer_healthy_accounts", prefer_healthy_accounts);
    addUpdate("balance_by_response_time", balance_by_response_time);
    addUpdate("avoid_consecutive_same_account", avoid_consecutive_same_account);
    addUpdate("track_performance_metrics", track_performance_metrics);
    addUpdate("log_rotation_decisions", log_rotation_decisions);
    addUpdate("notes", notes);

    if (updateFields.length === 0) {
      return c.json(
        {
          success: false,
          error: "No valid fields to update",
        },
        400
      );
    }

    // Add updated_at field
    updates.updated_at = new Date().toISOString();
    updateFields.push("updated_at = ${updated_at}");

    let updatedConfig;

    if (currentConfig) {
      // Update existing configuration - build dynamic query properly
      let query = `UPDATE email_rotation_config SET `;
      const values: any[] = [];
      let paramIndex = 1;

      // Build SET clause with proper parameter placeholders
      const setClause = updateFields
        .map((field) => {
          const fieldName = field.split(" = ")[0];
          const value =
            updates[fieldName] ||
            updates[fieldName.replace("${", "").replace("}", "")];
          values.push(value);
          return `${fieldName} = $${paramIndex++}`;
        })
        .join(", ");

      query += setClause;
      query += ` WHERE id = $${paramIndex}`;
      values.push(currentConfig.id);
      query += ` RETURNING *`;

      const result = await sql.unsafe(query, values);
      updatedConfig = result[0];
    } else {
      // Create new configuration if none exists
      const defaultConfig = {
        enabled: true,
        include_api_providers: true,
        strategy: "round_robin",
        api_smtp_balance_ratio: 0.7,
        prefer_api_over_smtp: true,
        api_fallback_to_smtp: true,
        smtp_fallback_to_api: true,
        emergency_fallback_enabled: true,
        max_retry_attempts: 3,
        retry_delay_ms: 1000,
        circuit_breaker_threshold: 5,
        prefer_healthy_accounts: true,
        balance_by_response_time: false,
        avoid_consecutive_same_account: false,
        track_performance_metrics: true,
        log_rotation_decisions: false,
        notes: "Configuration created via API",
        created_by: "admin",
        ...updates,
      };

      [updatedConfig] = await sql`
        INSERT INTO email_rotation_config (
          enabled, include_api_providers, strategy, api_smtp_balance_ratio,
          prefer_api_over_smtp, api_fallback_to_smtp, smtp_fallback_to_api,
          emergency_fallback_enabled, max_retry_attempts, retry_delay_ms,
          circuit_breaker_threshold, prefer_healthy_accounts, balance_by_response_time,
          avoid_consecutive_same_account, track_performance_metrics, log_rotation_decisions,
          notes, created_by, updated_at
        ) VALUES (
          ${defaultConfig.enabled}, ${defaultConfig.include_api_providers}, 
          ${defaultConfig.strategy}, ${defaultConfig.api_smtp_balance_ratio},
          ${defaultConfig.prefer_api_over_smtp}, ${defaultConfig.api_fallback_to_smtp}, 
          ${defaultConfig.smtp_fallback_to_api}, ${defaultConfig.emergency_fallback_enabled},
          ${defaultConfig.max_retry_attempts}, ${defaultConfig.retry_delay_ms},
          ${defaultConfig.circuit_breaker_threshold}, ${defaultConfig.prefer_healthy_accounts}, 
          ${defaultConfig.balance_by_response_time}, ${defaultConfig.avoid_consecutive_same_account},
          ${defaultConfig.track_performance_metrics}, ${defaultConfig.log_rotation_decisions},
          ${defaultConfig.notes}, ${defaultConfig.created_by}, ${defaultConfig.updated_at}
        ) RETURNING *
      `;
    }

    return c.json({
      success: true,
      data: updatedConfig,
      message: "Rotation configuration updated successfully",
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error updating config:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update rotation configuration",
      },
      500
    );
  }
});

/**
 * 🔄 Test rotation configuration
 */
app.post("/test", async (c) => {
  try {
    const sql = getDb(c);
    const hybridService = createHybridEmailRotationService(sql);

    // Simulate provider selection multiple times to test balance
    const testResults = {
      selections: [] as any[],
      summary: {
        api_count: 0,
        smtp_count: 0,
        total_tests: 20,
        api_percentage: 0,
        smtp_percentage: 0,
      },
    };

    for (let i = 0; i < 20; i++) {
      try {
        const provider = await hybridService.getNextProvider();
        if (provider) {
          testResults.selections.push({
            attempt: i + 1,
            type: provider.type,
            name: provider.name,
            priority: provider.priority,
            weight: provider.weight,
          });

          if (provider.type === "api") {
            testResults.summary.api_count++;
          } else {
            testResults.summary.smtp_count++;
          }
        }
      } catch (error) {
        testResults.selections.push({
          attempt: i + 1,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Calculate percentages
    const total =
      testResults.summary.api_count + testResults.summary.smtp_count;
    if (total > 0) {
      testResults.summary.api_percentage = Math.round(
        (testResults.summary.api_count / total) * 100
      );
      testResults.summary.smtp_percentage = Math.round(
        (testResults.summary.smtp_count / total) * 100
      );
    }

    return c.json({
      success: true,
      data: testResults,
      message: "Rotation configuration test completed",
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error testing config:", error);
    return c.json(
      {
        success: false,
        error: "Failed to test rotation configuration",
      },
      500
    );
  }
});

/**
 * 🔧 Reset rotation configuration to defaults
 */
app.post("/reset", async (c) => {
  try {
    const sql = getDb(c);

    const defaultConfig = {
      enabled: true,
      include_api_providers: true,
      strategy: "round_robin",
      api_smtp_balance_ratio: 0.7,
      prefer_api_over_smtp: true,
      api_fallback_to_smtp: true,
      smtp_fallback_to_api: true,
      emergency_fallback_enabled: true,
      max_retry_attempts: 3,
      retry_delay_ms: 1000,
      circuit_breaker_threshold: 5,
      prefer_healthy_accounts: true,
      balance_by_response_time: false,
      avoid_consecutive_same_account: false,
      track_performance_metrics: true,
      log_rotation_decisions: false,
      notes: "Configuration reset to defaults",
      created_by: "admin",
    };

    const [resetConfig] = await sql`
      INSERT INTO email_rotation_config (
        enabled, include_api_providers, strategy, api_smtp_balance_ratio,
        prefer_api_over_smtp, api_fallback_to_smtp, smtp_fallback_to_api,
        emergency_fallback_enabled, max_retry_attempts, retry_delay_ms,
        circuit_breaker_threshold, prefer_healthy_accounts, balance_by_response_time,
        avoid_consecutive_same_account, track_performance_metrics, log_rotation_decisions,
        notes, created_by
      ) VALUES (
        ${defaultConfig.enabled}, ${defaultConfig.include_api_providers}, 
        ${defaultConfig.strategy}, ${defaultConfig.api_smtp_balance_ratio},
        ${defaultConfig.prefer_api_over_smtp}, ${defaultConfig.api_fallback_to_smtp}, 
        ${defaultConfig.smtp_fallback_to_api}, ${defaultConfig.emergency_fallback_enabled},
        ${defaultConfig.max_retry_attempts}, ${defaultConfig.retry_delay_ms},
        ${defaultConfig.circuit_breaker_threshold}, ${defaultConfig.prefer_healthy_accounts}, 
        ${defaultConfig.balance_by_response_time}, ${defaultConfig.avoid_consecutive_same_account},
        ${defaultConfig.track_performance_metrics}, ${defaultConfig.log_rotation_decisions},
        ${defaultConfig.notes}, ${defaultConfig.created_by}
      ) RETURNING *
    `;

    return c.json({
      success: true,
      data: resetConfig,
      message: "Rotation configuration reset to defaults successfully",
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error resetting config:", error);
    return c.json(
      {
        success: false,
        error: "Failed to reset rotation configuration",
      },
      500
    );
  }
});

/**
 * 📈 Get configuration history
 */
app.get("/history", async (c) => {
  try {
    const sql = getDb(c);
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = parseInt(c.req.query("offset") || "0");

    const configs = await sql`
      SELECT 
        id, enabled, include_api_providers, strategy, 
        api_smtp_balance_ratio, prefer_api_over_smtp,
        notes, created_by, created_at, updated_at
      FROM email_rotation_config 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [totalCount] = await sql`
      SELECT COUNT(*) as total FROM email_rotation_config
    `;

    return c.json({
      success: true,
      data: {
        configs,
        pagination: {
          total: parseInt(totalCount.total),
          limit,
          offset,
          has_more: parseInt(totalCount.total) > offset + limit,
        },
      },
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error fetching history:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch configuration history",
      },
      500
    );
  }
});

export default app;
