/**
 * 📧 SMTP Accounts Management API
 * PlazaCMS Multi-SMTP Load Balancing System
 *
 * Provides CRUD operations for managing multiple SMTP accounts:
 * - List accounts with pagination & filters
 * - Create new SMTP accounts with validation
 * - Update existing accounts with encrypted passwords
 * - Delete accounts with safety checks
 * - Test individual account connections
 * - Health monitoring and statistics
 */

import { Hono } from "hono";
import { getDb } from "../lib/db";
import {
  createSMTPRotationService,
  SMTPRotationService,
} from "../lib/smtp-rotation-service";
import { createSMTPBackgroundService } from "../lib/smtp-background-service";

const app = new Hono();

/**
 * 📋 GET /api/admin/smtp-accounts - List all SMTP accounts
 */
app.get("/", async (c) => {
  try {
    const sql = getDb(c as any);

    // Get query parameters
    const page = parseInt(c.req.query("page") || "1", 10);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(c.req.query("pageSize") || "20", 10))
    );
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "all"; // all, active, inactive, healthy, unhealthy
    const sortBy = c.req.query("sortBy") || "created_at";
    const sortOrder = c.req.query("sortOrder") || "desc";
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push(
        `(name ILIKE $${queryParams.length + 1} OR host ILIKE $${
          queryParams.length + 1
        } OR description ILIKE $${queryParams.length + 1})`
      );
      queryParams.push(`%${search}%`);
    }

    if (status === "active") {
      whereConditions.push("is_active = TRUE");
    } else if (status === "inactive") {
      whereConditions.push("is_active = FALSE");
    } else if (status === "healthy") {
      whereConditions.push("is_healthy = TRUE");
    } else if (status === "unhealthy") {
      whereConditions.push("is_healthy = FALSE");
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Validate sort fields
    const allowedSortFields = [
      "name",
      "host",
      "priority",
      "weight",
      "created_at",
      "last_used_at",
      "total_success_count",
      "consecutive_failures",
    ];
    const validSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "created_at";
    const validSortOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

    // Build the full query using sql.unsafe() for dynamic parts
    let baseQuery = `
      SELECT 
        id, name, description, host, port, username, encryption,
        weight, priority, daily_limit, hourly_limit,
        is_active, is_healthy, last_used_at, consecutive_failures,
        total_success_count, total_failure_count, cooldown_until,
        today_sent_count, current_hour_sent, avg_response_time_ms,
        last_error_message, last_error_at, tags, metadata,
        from_email, from_name, created_at, updated_at,
        -- Calculate usage percentages
        CAST(((today_sent_count::float / NULLIF(daily_limit, 0)) * 100) AS DECIMAL(5,1)) as daily_usage_percent,
        CAST(((current_hour_sent::float / NULLIF(hourly_limit, 0)) * 100) AS DECIMAL(5,1)) as hourly_usage_percent,
        -- Calculate success rate
        CASE 
          WHEN (total_success_count + total_failure_count) > 0 
          THEN CAST(((total_success_count::float / (total_success_count + total_failure_count)) * 100) AS DECIMAL(5,1))
          ELSE NULL
        END as success_rate_percent
      FROM smtp_accounts 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // Get accounts with stats
    const accounts = await sql.unsafe(baseQuery, queryParams);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM smtp_accounts ${whereClause}`;
    const countResult = await sql.unsafe(countQuery, queryParams);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // Get summary statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_accounts,
        COUNT(CASE WHEN is_healthy = TRUE THEN 1 END) as healthy_accounts,
        SUM(today_sent_count) as total_emails_today,
        SUM(total_success_count) as total_successful_emails,
        SUM(total_failure_count) as total_failed_emails
      FROM smtp_accounts
    `;

    const response = {
      success: true,
      data: {
        accounts: accounts.map((account) => ({
          ...account,
          password_encrypted: "[ENCRYPTED]", // Mask password in response
          tags: Array.isArray(account.tags) ? account.tags : [],
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1,
        },
        filters: {
          search,
          status,
          sortBy: validSortBy,
          sortOrder: validSortOrder,
        },
        stats: stats[0],
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("[SMTP Accounts] List error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve SMTP accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📝 POST /api/admin/smtp-accounts - Create new SMTP account
 */
app.post("/", async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json();

    // Validate required fields
    const requiredFields = ["name", "host", "port", "username", "password"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return c.json(
        {
          success: false,
          error: "Missing required fields",
          details: `Required: ${missingFields.join(", ")}`,
        },
        400
      );
    }

    // Validate field types and constraints
    if (typeof body.port !== "number" || body.port < 1 || body.port > 65535) {
      return c.json(
        {
          success: false,
          error: "Invalid port number",
          details: "Port must be a number between 1 and 65535",
        },
        400
      );
    }

    if (!["tls", "ssl", "none"].includes(body.encryption)) {
      return c.json(
        {
          success: false,
          error: "Invalid encryption type",
          details: "Encryption must be 'tls', 'ssl', or 'none'",
        },
        400
      );
    }

    // Check for duplicate name or host+port combination
    const existingAccount = await sql`
      SELECT id, name, host, port 
      FROM smtp_accounts 
      WHERE name = ${body.name} OR (host = ${body.host} AND port = ${body.port} AND username = ${body.username})
    `;

    if (existingAccount.length > 0) {
      return c.json(
        {
          success: false,
          error: "SMTP account already exists",
          details:
            existingAccount[0].name === body.name
              ? `Account with name "${body.name}" already exists`
              : `Account with same host, port, and username already exists`,
        },
        409
      );
    }

    // Store password (TODO: implement proper encryption in production)
    const encryptedPassword = body.password;

    // Create new SMTP account
    const [newAccount] = await sql`
      INSERT INTO smtp_accounts (
        name, description, host, port, username, password_encrypted, encryption,
        weight, priority, daily_limit, hourly_limit, is_active, tags, metadata,
        from_email, from_name
      ) VALUES (
        ${body.name},
        ${body.description || null},
        ${body.host},
        ${body.port},
        ${body.username},
        ${encryptedPassword},
        ${body.encryption || "tls"},
        ${body.weight || 1},
        ${body.priority || 100},
        ${body.daily_limit || 1000},
        ${body.hourly_limit || 100},
        ${body.is_active !== false}, -- Default to true
        ${JSON.stringify(body.tags || [])},
        ${JSON.stringify(body.metadata || {})},
        ${
          body.from_email ||
          (body.username && body.username.includes("@")
            ? body.username
            : "noreply@plazacms.com")
        },
        ${body.from_name || "PlazaCMS"}
      ) RETURNING id, name, host, port, is_active, from_email, from_name, created_at
    `;

    console.log(
      `[SMTP Accounts] Created new account: ${newAccount.name} (${newAccount.host}:${newAccount.port})`
    );

    return c.json(
      {
        success: true,
        message: "SMTP account created successfully",
        data: {
          ...newAccount,
          password_encrypted: "[ENCRYPTED]", // Mask password in response
        },
      },
      201
    );
  } catch (error) {
    console.error("[SMTP Accounts] Create error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to create SMTP account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📝 GET /api/admin/smtp-accounts/config - Get SMTP rotation configuration
 */
app.get("/config", async (c) => {
  try {
    const sql = getDb(c as any);

    const [config] = await sql`
      SELECT * FROM smtp_rotation_config ORDER BY created_at DESC LIMIT 1
    `;

    if (!config) {
      // Return default configuration if none exists
      return c.json({
        success: true,
        data: {
          enabled: true,
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
        },
      });
    }

    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[SMTP Config] Get error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve SMTP configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📝 POST /api/admin/smtp-accounts/config - Update SMTP rotation configuration
 */
app.post("/config", async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json();

    // Validate required fields
    const config = {
      enabled: body.enabled !== false, // Default true
      fallback_to_single: body.fallback_to_single !== false, // Default true
      strategy: body.strategy || "round_robin",
      max_retry_attempts: Math.max(
        1,
        Math.min(10, body.max_retry_attempts || 3)
      ),
      retry_delay_seconds: Math.max(
        1,
        Math.min(300, body.retry_delay_seconds || 30)
      ),
      failure_cooldown_minutes: Math.max(
        1,
        Math.min(1440, body.failure_cooldown_minutes || 30)
      ),
      health_check_interval_minutes: Math.max(
        1,
        Math.min(60, body.health_check_interval_minutes || 5)
      ),
      failure_threshold: Math.max(1, Math.min(50, body.failure_threshold || 5)),
      success_threshold: Math.max(1, Math.min(20, body.success_threshold || 3)),
      prefer_healthy_accounts: body.prefer_healthy_accounts !== false,
      balance_by_response_time: body.balance_by_response_time || false,
      avoid_consecutive_same_account:
        body.avoid_consecutive_same_account !== false,
      emergency_fallback_enabled: body.emergency_fallback_enabled !== false,
      track_performance_metrics: body.track_performance_metrics !== false,
      log_rotation_decisions: body.log_rotation_decisions || false,
    };

    // Check if configuration exists
    const [existing] = await sql`
      SELECT id FROM smtp_rotation_config LIMIT 1
    `;

    let result;
    if (existing) {
      // Update existing configuration
      [result] = await sql`
        UPDATE smtp_rotation_config 
        SET 
          enabled = ${config.enabled},
          fallback_to_single = ${config.fallback_to_single},
          strategy = ${config.strategy},
          max_retry_attempts = ${config.max_retry_attempts},
          retry_delay_seconds = ${config.retry_delay_seconds},
          failure_cooldown_minutes = ${config.failure_cooldown_minutes},
          health_check_interval_minutes = ${config.health_check_interval_minutes},
          failure_threshold = ${config.failure_threshold},
          success_threshold = ${config.success_threshold},
          prefer_healthy_accounts = ${config.prefer_healthy_accounts},
          balance_by_response_time = ${config.balance_by_response_time},
          avoid_consecutive_same_account = ${config.avoid_consecutive_same_account},
          emergency_fallback_enabled = ${config.emergency_fallback_enabled},
          track_performance_metrics = ${config.track_performance_metrics},
          log_rotation_decisions = ${config.log_rotation_decisions},
          updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING *
      `;
    } else {
      // Create new configuration
      [result] = await sql`
        INSERT INTO smtp_rotation_config ${sql(config)}
        RETURNING *
      `;
    }

    console.log(
      `[SMTP Config] Configuration ${
        existing ? "updated" : "created"
      } successfully`
    );

    return c.json({
      success: true,
      data: result,
      message: `SMTP rotation configuration ${
        existing ? "updated" : "created"
      } successfully`,
    });
  } catch (error) {
    console.error("[SMTP Config] Save error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to save SMTP configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📊 GET /api/admin/smtp-accounts/stats/overview - Get overview statistics
 */
app.get("/stats/overview", async (c) => {
  try {
    const sql = getDb(c as any);
    const rotationService = createSMTPRotationService(c as any);

    const stats = await rotationService.getRotationStats(7); // Last 7 days

    return c.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SMTP Stats] Overview error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve overview statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 🔧 POST /api/admin/smtp-accounts/maintenance/health-check - Manual health check
 */
app.post("/maintenance/health-check", async (c) => {
  try {
    const sql = getDb(c as any);
    const backgroundService = createSMTPBackgroundService(c as any);

    await backgroundService.runManualHealthCheck();

    return c.json({
      success: true,
      message: "Manual health check completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SMTP Maintenance] Health check error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to run health check",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 🔄 POST /api/admin/smtp-accounts/maintenance/reset-counters - Reset usage counters
 */
app.post("/maintenance/reset-counters", async (c) => {
  try {
    const sql = getDb(c as any);
    const backgroundService = createSMTPBackgroundService(c as any);

    await backgroundService.runManualCounterReset();

    return c.json({
      success: true,
      message: "Manual counter reset completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SMTP Maintenance] Counter reset error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to reset counters",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📊 GET /api/admin/smtp-accounts/maintenance/rate-limits - Check rate limiting status
 */
app.get("/maintenance/rate-limits", async (c) => {
  try {
    const sql = getDb(c as any);
    const backgroundService = createSMTPBackgroundService(c as any);

    const status = await backgroundService.runManualRateLimitCheck();

    return c.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SMTP Maintenance] Rate limit check error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to check rate limits",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 🗑️ POST /api/admin/smtp-accounts/maintenance/cleanup - Manual cleanup
 */
app.post("/maintenance/cleanup", async (c) => {
  try {
    const sql = getDb(c as any);
    const backgroundService = createSMTPBackgroundService(c as any);

    await backgroundService.runManualCleanup();

    return c.json({
      success: true,
      message: "Manual cleanup completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SMTP Maintenance] Cleanup error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to run cleanup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 🔄 GET /api/admin/smtp-accounts/maintenance/status - Get background service status
 */
app.get("/maintenance/status", async (c) => {
  try {
    const sql = getDb(c as any);
    const backgroundService = createSMTPBackgroundService(c as any);

    const status = backgroundService.getServiceStatus();

    return c.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SMTP Maintenance] Status check error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get service status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📝 GET /api/admin/smtp-accounts/:id - Get single SMTP account
 */
app.get("/:id", async (c) => {
  try {
    const sql = getDb(c as any);
    const accountId = c.req.param("id");

    if (!accountId) {
      return c.json(
        {
          success: false,
          error: "Account ID is required",
        },
        400
      );
    }

    // Get account details with recent usage stats
    const [account] = await sql`
      SELECT 
        id, name, description, host, port, username, encryption,
        weight, priority, daily_limit, hourly_limit,
        is_active, is_healthy, last_used_at, consecutive_failures,
        total_success_count, total_failure_count, cooldown_until,
        today_sent_count, current_hour_sent, avg_response_time_ms,
        last_error_message, last_error_at, tags, metadata,
        created_at, updated_at,
        -- Usage percentages
        CAST(((today_sent_count::float / NULLIF(daily_limit, 0)) * 100) AS DECIMAL(5,1)) as daily_usage_percent,
        CAST(((current_hour_sent::float / NULLIF(hourly_limit, 0)) * 100) AS DECIMAL(5,1)) as hourly_usage_percent,
        -- Success rate
        CASE 
          WHEN (total_success_count + total_failure_count) > 0 
          THEN CAST(((total_success_count::float / (total_success_count + total_failure_count)) * 100) AS DECIMAL(5,1))
          ELSE NULL
        END as success_rate_percent
      FROM smtp_accounts 
      WHERE id = ${accountId}
    `;

    if (!account) {
      return c.json(
        {
          success: false,
          error: "SMTP account not found",
        },
        404
      );
    }

    // Get recent usage history (last 24 hours)
    const recentUsage = await sql`
      SELECT 
        status,
        recipient_email,
        subject,
        response_time_ms,
        error_message,
        created_at
      FROM smtp_usage_logs 
      WHERE smtp_account_id = ${accountId} 
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC 
      LIMIT 50
    `;

    // Get recent health checks (last 10)
    const healthChecks = await sql`
      SELECT 
        status,
        response_time_ms,
        error_message,
        checked_at
      FROM smtp_account_health_checks 
      WHERE smtp_account_id = ${accountId}
      ORDER BY checked_at DESC 
      LIMIT 10
    `;

    return c.json({
      success: true,
      data: {
        account: {
          ...account,
          password_encrypted: "[ENCRYPTED]", // Mask password
          tags: Array.isArray(account.tags) ? account.tags : [],
        },
        recent_usage: recentUsage,
        health_checks: healthChecks,
      },
    });
  } catch (error) {
    console.error("[SMTP Accounts] Get single error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve SMTP account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📝 PUT /api/admin/smtp-accounts/:id - Update SMTP account
 */
app.put("/:id", async (c) => {
  try {
    const sql = getDb(c as any);
    const accountId = c.req.param("id");
    const body = await c.req.json();

    if (!accountId) {
      return c.json(
        {
          success: false,
          error: "Account ID is required",
        },
        400
      );
    }

    // Check if account exists
    const [existingAccount] = await sql`
      SELECT id, name FROM smtp_accounts WHERE id = ${accountId}
    `;

    if (!existingAccount) {
      return c.json(
        {
          success: false,
          error: "SMTP account not found",
        },
        404
      );
    }

    // Validate field types if provided
    if (
      body.port &&
      (typeof body.port !== "number" || body.port < 1 || body.port > 65535)
    ) {
      return c.json(
        {
          success: false,
          error: "Invalid port number",
          details: "Port must be a number between 1 and 65535",
        },
        400
      );
    }

    if (body.encryption && !["tls", "ssl", "none"].includes(body.encryption)) {
      return c.json(
        {
          success: false,
          error: "Invalid encryption type",
          details: "Encryption must be 'tls', 'ssl', or 'none'",
        },
        400
      );
    }

    // Check for duplicate name if name is being changed
    if (body.name && body.name !== existingAccount.name) {
      const [duplicateName] = await sql`
        SELECT id FROM smtp_accounts WHERE name = ${body.name} AND id != ${accountId}
      `;

      if (duplicateName) {
        return c.json(
          {
            success: false,
            error: "Account name already exists",
            details: `Another account with name "${body.name}" already exists`,
          },
          409
        );
      }
    }

    // Build update object dynamically
    const updateData: any = {};

    const allowedFields = [
      "name",
      "description",
      "host",
      "port",
      "username",
      "encryption",
      "weight",
      "priority",
      "daily_limit",
      "hourly_limit",
      "is_active",
      "from_email",
      "from_name",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle password update - only if provided
    if (body.password && body.password.trim() !== "") {
      updateData.password_encrypted = body.password.trim();
    }

    // Handle tags and metadata
    if (body.tags !== undefined) {
      updateData.tags = JSON.stringify(
        Array.isArray(body.tags) ? body.tags : []
      );
    }

    if (body.metadata !== undefined) {
      updateData.metadata = JSON.stringify(body.metadata || {});
    }

    // Always update updated_at
    updateData.updated_at = sql`NOW()`;

    if (Object.keys(updateData).length === 1) {
      // Only updated_at
      return c.json(
        {
          success: false,
          error: "No valid fields provided to update",
        },
        400
      );
    }

    // Perform update
    const [updatedAccount] = await sql`
      UPDATE smtp_accounts 
      SET ${sql(updateData, Object.keys(updateData))}
      WHERE id = ${accountId}
      RETURNING id, name, host, port, is_active, updated_at
    `;

    console.log(
      `[SMTP Accounts] Updated account: ${updatedAccount.name} (ID: ${accountId})`
    );

    return c.json({
      success: true,
      message: "SMTP account updated successfully",
      data: updatedAccount,
    });
  } catch (error) {
    console.error("[SMTP Accounts] Update error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update SMTP account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 🗑️ DELETE /api/admin/smtp-accounts/:id - Delete SMTP account
 */
app.delete("/:id", async (c) => {
  try {
    const sql = getDb(c as any);
    const accountId = c.req.param("id");

    if (!accountId) {
      return c.json(
        {
          success: false,
          error: "Account ID is required",
        },
        400
      );
    }

    // Check if account exists and get details
    const [existingAccount] = await sql`
      SELECT id, name, is_active FROM smtp_accounts WHERE id = ${accountId}
    `;

    if (!existingAccount) {
      return c.json(
        {
          success: false,
          error: "SMTP account not found",
        },
        404
      );
    }

    // Safety check: ensure at least one other active account exists if this one is active
    if (existingAccount.is_active) {
      const [activeCount] = await sql`
        SELECT COUNT(*) as count FROM smtp_accounts WHERE is_active = TRUE AND id != ${accountId}
      `;

      if (parseInt(activeCount.count) === 0) {
        return c.json(
          {
            success: false,
            error: "Cannot delete the last active SMTP account",
            details:
              "At least one active SMTP account must remain in the system",
          },
          400
        );
      }
    }

    // Delete the account (cascading deletes will handle related records)
    await sql`
      DELETE FROM smtp_accounts WHERE id = ${accountId}
    `;

    console.log(
      `[SMTP Accounts] Deleted account: ${existingAccount.name} (ID: ${accountId})`
    );

    return c.json({
      success: true,
      message: `SMTP account "${existingAccount.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("[SMTP Accounts] Delete error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete SMTP account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 🧪 POST /api/admin/smtp-accounts/:id/test - Test SMTP account connection
 */
app.post("/:id/test", async (c) => {
  try {
    const sql = getDb(c as any);
    const accountId = c.req.param("id");
    const body = await c.req.json();

    if (!accountId) {
      return c.json(
        {
          success: false,
          error: "Account ID is required",
        },
        400
      );
    }

    // Get account details
    const [account] = await sql`
      SELECT id, name, host, port, username, password_encrypted, encryption, from_email, from_name
      FROM smtp_accounts WHERE id = ${accountId}
    `;

    if (!account) {
      return c.json(
        {
          success: false,
          error: "SMTP account not found",
        },
        404
      );
    }

    const testEmail = body.email || "test@example.com";

    // Create rotation service and perform REAL SMTP test
    const rotationService = createSMTPRotationService(sql);

    // Perform real SMTP test to the specified email address
    let testSuccess = false;
    let responseTime = 0;
    let errorMessage = "";
    const startTime = Date.now();

    try {
      const { WorkerMailer } = await import("worker-mailer");

      // Test SMTP connection and send email to specified address
      await WorkerMailer.send(
        {
          host: account.host,
          port: account.port,
          secure: account.encryption === "ssl",
          startTls: account.encryption === "tls",
          credentials: {
            username: account.username,
            password: rotationService.decryptPassword(
              account.password_encrypted
            ),
          },
          authType: "plain",
        },
        {
          from: {
            name: account.from_name || "SMTP Test",
            email: account.from_email || "noreply@plazacms.com",
          },
          to: testEmail, // Send to the specified test email
          subject: `Test Email from ${account.name}`,
          text: `This is a test email sent from ${account.name} (${
            account.host
          }) at ${new Date().toISOString()}. If you receive this, the SMTP configuration is working correctly.`,
          html: `<p>This is a test email sent from <strong>${
            account.name
          }</strong> (${
            account.host
          }) at ${new Date().toISOString()}.</p><p>If you receive this, the SMTP configuration is working correctly.</p>`,
        }
      );

      responseTime = Date.now() - startTime;
      testSuccess = true;
      console.log(
        `[SMTP Test] Successfully sent test email to ${testEmail} via ${account.name}`
      );
    } catch (error: any) {
      responseTime = Date.now() - startTime;
      testSuccess = false;
      errorMessage = error.message || "SMTP test failed";
      console.error(
        `[SMTP Test] Failed to send test email via ${account.name}:`,
        errorMessage
      );
    }

    const result = {
      success: testSuccess,
      account_name: account.name,
      account_host: account.host,
      test_email: testEmail,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString(),
      message: testSuccess
        ? `Successfully connected to ${account.host}:${account.port} and sent test email to ${testEmail}`
        : `Failed to send test email via ${account.host}:${account.port} - ${errorMessage}`,
      ...(errorMessage && !testSuccess && { error_details: errorMessage }),
    };

    // Log the test attempt
    await sql`
      INSERT INTO smtp_account_health_checks (
        smtp_account_id, status, response_time_ms, test_email_sent, test_recipient, checked_at
      ) VALUES (
        ${accountId}, 
        ${testSuccess ? "healthy" : "connection_error"}, 
        ${responseTime}, 
        TRUE,
        ${testEmail},
        NOW()
      )
    `;

    // Update account statistics for analytics
    if (testSuccess) {
      await sql`
        UPDATE smtp_accounts 
        SET 
          total_success_count = total_success_count + 1,
          today_sent_count = today_sent_count + 1,
          current_hour_sent = current_hour_sent + 1,
          last_used_at = NOW(),
          consecutive_failures = 0,
          is_healthy = TRUE,
          updated_at = NOW()
        WHERE id = ${accountId}
      `;

      // Log usage for analytics
      await sql`
        INSERT INTO smtp_usage_logs (
          smtp_account_id, recipient_email, subject, status, 
          response_time_ms, rotation_strategy, was_fallback, attempt_number
        ) VALUES (
          ${accountId}, ${testEmail}, ${
        "Test Email from " + account.name
      }, 'success',
          ${responseTime}, 'manual_test', FALSE, 1
        )
      `;
    } else {
      await sql`
        UPDATE smtp_accounts 
        SET 
          total_failure_count = total_failure_count + 1,
          consecutive_failures = consecutive_failures + 1,
          is_healthy = CASE WHEN consecutive_failures >= 5 THEN FALSE ELSE is_healthy END,
          last_error_message = ${errorMessage},
          last_error_at = NOW(),
          updated_at = NOW()
        WHERE id = ${accountId}
      `;
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[SMTP Accounts] Test error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to test SMTP account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
