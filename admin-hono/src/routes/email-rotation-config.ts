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

/**
 * 📊 Get email rotation analytics
 */
app.get("/analytics", async (c) => {
  try {
    const sql = getDb(c);
    const range = c.req.query("range") || "7d";

    // Calculate date range
    let daysBack = 7;
    switch (range) {
      case "24h":
        daysBack = 1;
        break;
      case "7d":
        daysBack = 7;
        break;
      case "30d":
        daysBack = 30;
        break;
      case "90d":
        daysBack = 90;
        break;
      default:
        daysBack = 7;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get overview stats
    const [overviewStats] = await sql`
      SELECT 
        COUNT(*) as total_emails_sent,
        AVG(CASE WHEN status = 'success' THEN 100.0 ELSE 0.0 END) as success_rate,
        AVG(response_time_ms) as avg_response_time,
        COUNT(DISTINCT CASE WHEN provider_type = 'smtp' THEN account_id WHEN provider_type = 'api' THEN api_provider_id END) as active_providers
      FROM email_usage_logs 
      WHERE created_at >= ${startDate.toISOString()}
    `;

    // Get total provider count
    const [smtpCount] =
      await sql`SELECT COUNT(*) as count FROM smtp_accounts WHERE is_active = true`;
    const [apiCount] =
      await sql`SELECT COUNT(*) as count FROM email_api_providers WHERE is_active = true`;
    const totalProviders = parseInt(smtpCount.count) + parseInt(apiCount.count);

    // Get daily stats
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN provider_type = 'api' THEN 1 END) as api_sent,
        COUNT(CASE WHEN provider_type = 'smtp' THEN 1 END) as smtp_sent,
        COUNT(*) as total_sent,
        AVG(CASE WHEN status = 'success' THEN 100.0 ELSE 0.0 END) as success_rate,
        AVG(response_time_ms) as avg_response_time
      FROM email_usage_logs 
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get provider analytics for API providers
    const apiProviderStats = await sql`
      SELECT 
        p.name,
        'api' as type,
        COUNT(l.id) as total_sent,
        AVG(CASE WHEN l.status = 'success' THEN 100.0 ELSE 0.0 END) as success_rate,
        AVG(l.response_time_ms) as avg_response_time
      FROM email_api_providers p
      LEFT JOIN email_usage_logs l ON p.id = l.api_provider_id 
        AND l.created_at >= ${startDate.toISOString()}
      WHERE p.is_active = true
      GROUP BY p.id, p.name
      ORDER BY total_sent DESC
    `;

    // Get provider analytics for SMTP accounts
    const smtpProviderStats = await sql`
      SELECT 
        s.name as name,
        'smtp' as type,
        COALESCE(s.today_sent_count, 0) as total_sent,
        COALESCE(s.total_success_count * 100.0 / NULLIF(s.total_success_count + s.total_failure_count, 0), 100) as success_rate,
        COALESCE(s.avg_response_time_ms, 0) as avg_response_time
      FROM smtp_accounts s
      WHERE s.is_active = true
      ORDER BY total_sent DESC
    `;

    // Combine provider stats
    const providerAnalytics = [
      ...apiProviderStats.map((p) => ({
        name: p.name,
        type: p.type,
        total_sent: parseInt(p.total_sent) || 0,
        success_rate: parseFloat(p.success_rate) || 0,
        avg_response_time: parseInt(p.avg_response_time) || 0,
        daily_breakdown: [], // Simplified for now
      })),
      ...smtpProviderStats.map((p) => ({
        name: p.name,
        type: p.type,
        total_sent: parseInt(p.total_sent) || 0,
        success_rate: parseFloat(p.success_rate) || 0,
        avg_response_time: parseInt(p.avg_response_time) || 0,
        daily_breakdown: [], // Simplified for now
      })),
    ];

    // Find performance metrics
    const fastestProvider = providerAnalytics.reduce((prev, current) =>
      current.avg_response_time < prev.avg_response_time &&
      current.total_sent > 0
        ? current
        : prev
    );

    const mostReliable = providerAnalytics.reduce((prev, current) =>
      current.success_rate > prev.success_rate && current.total_sent > 0
        ? current
        : prev
    );

    const mostUsed = providerAnalytics.reduce((prev, current) =>
      current.total_sent > prev.total_sent ? current : prev
    );

    const [errorStats] = await sql`
      SELECT 
        COUNT(CASE WHEN status != 'success' THEN 1 END) as total_failures,
        COUNT(CASE WHEN attempt_number > 1 THEN 1 END) as total_retries
      FROM email_usage_logs 
      WHERE created_at >= ${startDate.toISOString()}
    `;

    const analyticsData = {
      overview: {
        total_emails_sent: parseInt(overviewStats.total_emails_sent) || 0,
        success_rate: parseFloat(overviewStats.success_rate) || 0,
        avg_response_time: parseInt(overviewStats.avg_response_time) || 0,
        active_providers: parseInt(overviewStats.active_providers) || 0,
        total_providers: totalProviders,
      },
      daily_stats: dailyStats.map((day) => ({
        date: day.date,
        api_sent: parseInt(day.api_sent) || 0,
        smtp_sent: parseInt(day.smtp_sent) || 0,
        total_sent: parseInt(day.total_sent) || 0,
        success_rate: parseFloat(day.success_rate) || 0,
        avg_response_time: parseInt(day.avg_response_time) || 0,
      })),
      provider_analytics: providerAnalytics,
      performance_metrics: {
        fastest_provider: {
          name: fastestProvider.name,
          avg_time: fastestProvider.avg_response_time,
        },
        most_reliable: {
          name: mostReliable.name,
          success_rate: mostReliable.success_rate,
        },
        most_used: {
          name: mostUsed.name,
          total_sent: mostUsed.total_sent,
        },
        total_failures: parseInt(errorStats.total_failures) || 0,
        total_retries: parseInt(errorStats.total_retries) || 0,
      },
    };

    return c.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error fetching analytics:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch analytics data",
      },
      500
    );
  }
});

/**
 * 📋 Get email rotation logs
 */
app.get("/logs", async (c) => {
  try {
    const sql = getDb(c);

    // Query parameters
    const page = parseInt(c.req.query("page") || "1");
    const perPage = parseInt(c.req.query("per_page") || "20");
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "all";
    const provider = c.req.query("provider") || "all";
    const range = c.req.query("range") || "7d";

    // Calculate date range
    let daysBack = 7;
    switch (range) {
      case "1h":
        daysBack = 1 / 24;
        break;
      case "24h":
        daysBack = 1;
        break;
      case "7d":
        daysBack = 7;
        break;
      case "30d":
        daysBack = 30;
        break;
      default:
        daysBack = 7;
    }

    const startDate = new Date();
    startDate.setTime(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const offset = (page - 1) * perPage;

    // Build WHERE conditions
    let conditions: string[] = [];
    let values: any[] = [];

    // Always include date filter
    conditions.push("created_at >= $1");
    values.push(startDate.toISOString());

    // Add search filter
    if (search && search.trim()) {
      const searchIndex = values.length + 1;
      conditions.push(
        `(recipient_email ILIKE $${searchIndex} OR subject ILIKE $${searchIndex} OR provider_name ILIKE $${searchIndex})`
      );
      values.push(`%${search}%`);
    }

    // Add status filter
    if (status !== "all") {
      conditions.push(`status = $${values.length + 1}`);
      values.push(status);
    }

    // Add provider filter
    if (provider !== "all") {
      conditions.push(`provider_name = $${values.length + 1}`);
      values.push(provider);
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const totalQuery = `SELECT COUNT(*) as total FROM email_usage_logs WHERE ${whereClause}`;
    const [totalCount] = await sql.unsafe(totalQuery, values);

    // Get logs
    const logsQuery = `
      SELECT 
        id, created_at as timestamp, provider_name, provider_type,
        recipient_email as recipient, subject, status, message_id,
        response_time_ms as response_time, error_code, error_message,
        rotation_strategy, was_fallback, attempt_number
      FROM email_usage_logs 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const logs = await sql.unsafe(logsQuery, [...values, perPage, offset]);

    // Get filter options
    const providers = await sql`
      SELECT provider_name as name, provider_type as type, COUNT(*) as count
      FROM email_usage_logs
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY provider_name, provider_type
      ORDER BY count DESC
    `;

    const statuses = await sql`
      SELECT status, COUNT(*) as count
      FROM email_usage_logs
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY status
      ORDER BY count DESC
    `;

    const logsData = {
      logs: logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        provider_name: log.provider_name,
        provider_type: log.provider_type,
        recipient: log.recipient,
        subject: log.subject,
        status: log.status,
        message_id: log.message_id,
        response_time: parseInt(log.response_time) || 0,
        error_code: log.error_code,
        error_message: log.error_message,
        rotation_strategy: log.rotation_strategy,
        was_fallback: log.was_fallback,
        attempt_number: parseInt(log.attempt_number) || 1,
      })),
      pagination: {
        total: parseInt(totalCount.total) || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((parseInt(totalCount.total) || 0) / perPage),
      },
      filters: {
        providers: providers.map((p) => ({
          name: p.name,
          type: p.type,
          count: parseInt(p.count) || 0,
        })),
        statuses: statuses.map((s) => ({
          status: s.status,
          count: parseInt(s.count) || 0,
        })),
        date_range: {
          from: startDate.toISOString().split("T")[0],
          to: new Date().toISOString().split("T")[0],
        },
      },
    };

    return c.json({
      success: true,
      data: logsData,
    });
  } catch (error) {
    console.error("[EmailRotationConfig] Error fetching logs:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch logs data",
      },
      500
    );
  }
});

export default app;
