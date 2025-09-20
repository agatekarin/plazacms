/**
 * 📧 Email API Providers Management Routes
 *
 * Handles CRUD operations for email API providers (Resend, Brevo, Mailjet)
 * Part of the Hybrid Email Rotation System
 */

import { Hono } from "hono";
import { getDb } from "../lib/db";
import {
  EmailAPIRotationService,
  createEmailAPIRotationService,
} from "../lib/email-api-rotation-service";
import {
  testProviderAdapter,
  createProviderAdapter,
} from "../lib/email-api-adapters";

// Use proper Env type for Hono
const app = new Hono<{ Bindings: Env }>();

/**
 * 📋 Get all API providers
 */
app.get("/", async (c) => {
  try {
    const sql = getDb(c);

    const providers = await sql`
      SELECT 
        id,
        name,
        provider_type,
        api_key_encrypted,
        api_secret_encrypted,
        base_url,
        from_email,
        weight,
        priority,
        daily_limit,
        hourly_limit,
        is_active,
        is_healthy,
        consecutive_failures,
        total_success_count,
        total_failure_count,
        today_sent_count,
        current_hour_sent,
        avg_response_time_ms,
        last_used_at,
        last_health_check_at,
        last_error_message,
        last_error_at,
        tags,
        metadata,
        created_at,
        updated_at
      FROM email_api_providers 
      ORDER BY priority ASC, name ASC
    `;

    return c.json({
      success: true,
      data: providers.map((provider) => ({
        ...provider,
        tags: Array.isArray(provider.tags) ? provider.tags : [],
        metadata: provider.metadata || {},
      })),
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error fetching providers:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch API providers",
      },
      500
    );
  }
});

/**
 * 📊 Get provider statistics
 */
app.get("/stats", async (c) => {
  try {
    const sql = getDb(c);
    const apiRotationService = createEmailAPIRotationService(sql);

    const stats = await apiRotationService.getProviderStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error fetching stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch provider statistics",
      },
      500
    );
  }
});

/**
 * 📊 Get provider statistics by ID
 */
app.get("/:id/stats", async (c) => {
  try {
    const providerId = c.req.param("id");
    const sql = getDb(c);
    const apiRotationService = createEmailAPIRotationService(sql);

    const stats = await apiRotationService.getProviderStats(providerId);

    if (stats.length === 0) {
      return c.json(
        {
          success: false,
          error: "Provider not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error fetching provider stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch provider statistics",
      },
      500
    );
  }
});

/**
 * ➕ Create new API provider
 */
app.post("/", async (c) => {
  try {
    const sql = getDb(c);
    const body = await c.req.json();

    const {
      name,
      provider_type,
      api_key,
      api_secret,
      base_url,
      from_email,
      weight = 1,
      priority = 100,
      daily_limit = 10000,
      hourly_limit = 1000,
      is_active = true,
      tags = [],
      metadata = {},
      provider_config = {},
    } = body;

    // Validate required fields
    if (!name || !provider_type || !api_key || !from_email) {
      return c.json(
        {
          success: false,
          error:
            "Missing required fields: name, provider_type, api_key, from_email",
        },
        400
      );
    }

    // Validate provider type
    if (!["resend", "brevo", "mailjet"].includes(provider_type)) {
      return c.json(
        {
          success: false,
          error: "Invalid provider_type. Must be: resend, brevo, or mailjet",
        },
        400
      );
    }

    // Validate Mailjet has both API key and secret
    if (provider_type === "mailjet" && !api_secret) {
      return c.json(
        {
          success: false,
          error: "Mailjet requires both api_key and api_secret",
        },
        400
      );
    }

    // Check if name already exists
    const [existingProvider] = await sql`
      SELECT id FROM email_api_providers WHERE name = ${name}
    `;

    if (existingProvider) {
      return c.json(
        {
          success: false,
          error: "Provider name already exists",
        },
        400
      );
    }

    // For now, store keys as-is (TODO: implement proper encryption)
    const encryptedApiKey = api_key;
    const encryptedApiSecret = api_secret || null;

    // Insert new provider
    const [newProvider] = await sql`
      INSERT INTO email_api_providers (
        name,
        provider_type,
        api_key_encrypted,
        api_secret_encrypted,
        base_url,
        from_email,
        weight,
        priority,
        daily_limit,
        hourly_limit,
        is_active,
        is_healthy,
        tags,
        metadata,
        provider_config,
        today_sent_count,
        current_hour_sent,
        daily_reset_at,
        hourly_reset_at
      ) VALUES (
        ${name},
        ${provider_type},
        ${encryptedApiKey},
        ${encryptedApiSecret},
        ${base_url || null},
        ${from_email},
        ${weight},
        ${priority},
        ${daily_limit},
        ${hourly_limit},
        ${is_active},
        true,
        ${JSON.stringify(tags)},
        ${JSON.stringify(metadata)},
        ${JSON.stringify(provider_config)},
        0,
        0,
        CURRENT_DATE,
        DATE_TRUNC('hour', NOW())
      ) RETURNING id, name, provider_type, from_email, is_active
    `;

    return c.json({
      success: true,
      data: newProvider,
      message: `API provider '${name}' created successfully`,
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error creating provider:", error);
    return c.json(
      {
        success: false,
        error: "Failed to create API provider",
      },
      500
    );
  }
});

/**
 * 📝 Update API provider
 */
app.put("/:id", async (c) => {
  try {
    const providerId = c.req.param("id");
    const sql = getDb(c);
    const body = await c.req.json();

    const {
      name,
      api_key,
      api_secret,
      base_url,
      from_email,
      weight,
      priority,
      daily_limit,
      hourly_limit,
      is_active,
      tags,
      metadata,
      provider_config,
    } = body;

    // Check if provider exists
    const [existingProvider] = await sql`
      SELECT id, name, provider_type FROM email_api_providers WHERE id = ${providerId}
    `;

    if (!existingProvider) {
      return c.json(
        {
          success: false,
          error: "Provider not found",
        },
        404
      );
    }

    // Check if new name conflicts with another provider
    if (name && name !== existingProvider.name) {
      const [nameConflict] = await sql`
        SELECT id FROM email_api_providers 
        WHERE name = ${name} AND id != ${providerId}
      `;

      if (nameConflict) {
        return c.json(
          {
            success: false,
            error: "Provider name already exists",
          },
          400
        );
      }
    }

    // Build update query dynamically
    const updates: any = {};
    const updateFields: string[] = [];

    if (name !== undefined) {
      updates.name = name;
      updateFields.push("name = ${name}");
    }

    if (api_key !== undefined) {
      updates.api_key_encrypted = api_key; // TODO: encrypt
      updateFields.push("api_key_encrypted = ${api_key_encrypted}");
    }

    if (api_secret !== undefined) {
      updates.api_secret_encrypted = api_secret; // TODO: encrypt
      updateFields.push("api_secret_encrypted = ${api_secret_encrypted}");
    }

    if (base_url !== undefined) {
      updates.base_url = base_url;
      updateFields.push("base_url = ${base_url}");
    }

    if (from_email !== undefined) {
      updates.from_email = from_email;
      updateFields.push("from_email = ${from_email}");
    }

    if (weight !== undefined) {
      updates.weight = weight;
      updateFields.push("weight = ${weight}");
    }

    if (priority !== undefined) {
      updates.priority = priority;
      updateFields.push("priority = ${priority}");
    }

    if (daily_limit !== undefined) {
      updates.daily_limit = daily_limit;
      updateFields.push("daily_limit = ${daily_limit}");
    }

    if (hourly_limit !== undefined) {
      updates.hourly_limit = hourly_limit;
      updateFields.push("hourly_limit = ${hourly_limit}");
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
      updateFields.push("is_active = ${is_active}");
    }

    if (tags !== undefined) {
      updates.tags = JSON.stringify(tags);
      updateFields.push("tags = ${tags}");
    }

    if (metadata !== undefined) {
      updates.metadata = JSON.stringify(metadata);
      updateFields.push("metadata = ${metadata}");
    }

    if (provider_config !== undefined) {
      updates.provider_config = JSON.stringify(provider_config);
      updateFields.push("provider_config = ${provider_config}");
    }

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

    // Execute update - build dynamic query properly
    let query = `UPDATE email_api_providers SET `;
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
    values.push(providerId);
    query += ` RETURNING id, name, provider_type, is_active, updated_at`;

    const result = await sql.unsafe(query, values);
    const updatedProvider = result[0];

    return c.json({
      success: true,
      data: updatedProvider,
      message: `API provider '${updatedProvider.name}' updated successfully`,
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error updating provider:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update API provider",
      },
      500
    );
  }
});

/**
 * 🗑️ Delete API provider
 */
app.delete("/:id", async (c) => {
  try {
    const providerId = c.req.param("id");
    const sql = getDb(c);

    // Check if provider exists
    const [existingProvider] = await sql`
      SELECT id, name FROM email_api_providers WHERE id = ${providerId}
    `;

    if (!existingProvider) {
      return c.json(
        {
          success: false,
          error: "Provider not found",
        },
        404
      );
    }

    // Delete provider and related data
    await sql.begin(async (tx) => {
      // Delete health checks
      await tx`
        DELETE FROM email_api_health_checks 
        WHERE api_provider_id = ${providerId}
      `;

      // Delete usage logs (optional - might want to keep for historical data)
      // await tx`
      //   DELETE FROM email_usage_logs
      //   WHERE api_provider_id = ${providerId}
      // `;

      // Delete provider
      await tx`
        DELETE FROM email_api_providers 
        WHERE id = ${providerId}
      `;
    });

    return c.json({
      success: true,
      message: `API provider '${existingProvider.name}' deleted successfully`,
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error deleting provider:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete API provider",
      },
      500
    );
  }
});

/**
 * 🧪 Test API provider connection
 */
app.post("/:id/test", async (c) => {
  try {
    const providerId = c.req.param("id");
    const sql = getDb(c);
    const body = await c.req.json();
    const { test_email } = body;

    if (!test_email) {
      return c.json(
        {
          success: false,
          error: "test_email is required",
        },
        400
      );
    }

    // Get provider details
    const [provider] = await sql`
      SELECT 
        id, name, provider_type, api_key_encrypted, api_secret_encrypted,
        base_url, provider_config
      FROM email_api_providers 
      WHERE id = ${providerId}
    `;

    if (!provider) {
      return c.json(
        {
          success: false,
          error: "Provider not found",
        },
        404
      );
    }

    // Create adapter and test
    const adapter = createProviderAdapter(
      provider.provider_type,
      provider.name,
      provider.api_key_encrypted, // TODO: decrypt
      provider.api_secret_encrypted, // TODO: decrypt
      {
        ...(provider.provider_config || {}),
        from_email: provider.from_email,
      }
    );

    const testResult = await testProviderAdapter(adapter, test_email);

    // Record test result in health checks
    await sql`
      INSERT INTO email_api_health_checks (
        api_provider_id,
        status,
        response_time_ms,
        error_message,
        test_endpoint,
        checked_at
      ) VALUES (
        ${providerId},
        ${testResult.health.healthy ? "healthy" : "unhealthy"},
        ${testResult.health.responseTime || 0},
        ${testResult.health.error || null},
        'test_connection',
        NOW()
      )
    `;

    // Update provider health status
    await sql`
      UPDATE email_api_providers 
      SET 
        is_healthy = ${testResult.health.healthy},
        last_health_check_at = NOW(),
        last_error_message = ${testResult.health.error || null},
        last_error_at = ${testResult.health.healthy ? null : "NOW()"}
      WHERE id = ${providerId}
    `;

    return c.json({
      success: true,
      data: {
        provider_name: provider.name,
        provider_type: provider.provider_type,
        health: testResult.health,
        config_valid: testResult.configValid,
        test_email_sent: !!testResult.testEmailResult?.success,
        test_email_result: testResult.testEmailResult,
      },
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error testing provider:", error);
    return c.json(
      {
        success: false,
        error: "Failed to test API provider",
      },
      500
    );
  }
});

/**
 * 💊 Run health check for provider
 */
app.post("/:id/health-check", async (c) => {
  try {
    const providerId = c.req.param("id");
    const sql = getDb(c);
    const apiRotationService = createEmailAPIRotationService(sql);

    const isHealthy = await apiRotationService.checkProviderHealth(providerId);

    return c.json({
      success: true,
      data: {
        provider_id: providerId,
        is_healthy: isHealthy,
        checked_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error checking health:", error);
    return c.json(
      {
        success: false,
        error: "Failed to check provider health",
      },
      500
    );
  }
});

/**
 * 🔄 Reset provider counters
 */
app.post("/:id/reset-counters", async (c) => {
  try {
    const providerId = c.req.param("id");
    const sql = getDb(c);

    await sql`
      UPDATE email_api_providers 
      SET 
        today_sent_count = 0,
        current_hour_sent = 0,
        daily_reset_at = CURRENT_DATE,
        hourly_reset_at = DATE_TRUNC('hour', NOW()),
        updated_at = NOW()
      WHERE id = ${providerId}
    `;

    return c.json({
      success: true,
      message: "Provider counters reset successfully",
    });
  } catch (error) {
    console.error("[EmailAPIProviders] Error resetting counters:", error);
    return c.json(
      {
        success: false,
        error: "Failed to reset provider counters",
      },
      500
    );
  }
});

export default app;
