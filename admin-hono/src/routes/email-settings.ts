/**
 * 📧 Email Settings API
 * PlazaCMS Email Management System
 *
 * Handles general email settings including test email defaults
 */

import { Hono } from "hono";
import { getDb } from "../lib/db";

const app = new Hono();

/**
 * 📝 GET /api/admin/email-settings/test-email - Get default test email
 */
app.get("/test-email", async (c) => {
  try {
    const sql = getDb(c as any);

    const [setting] = await sql`
      SELECT value as default_test_email
      FROM email_setting_values 
      WHERE setting_key = 'default_test_email'
    `;

    return c.json({
      success: true,
      data: {
        default_test_email: setting?.default_test_email || "",
      },
    });
  } catch (error) {
    console.error("[Email Settings] Get test email error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve default test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * 📝 POST /api/admin/email-settings/test-email - Save default test email
 */
app.post("/test-email", async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json();

    if (!body.default_test_email) {
      return c.json(
        {
          success: false,
          error: "default_test_email is required",
        },
        400
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.default_test_email)) {
      return c.json(
        {
          success: false,
          error: "Invalid email format",
        },
        400
      );
    }

    // Use UPSERT pattern for email settings
    const [existing] = await sql`
      SELECT id FROM email_setting_values WHERE setting_key = 'default_test_email'
    `;

    if (existing) {
      // Update existing setting
      await sql`
        UPDATE email_setting_values 
        SET 
          value = ${body.default_test_email},
          updated_at = NOW()
        WHERE setting_key = 'default_test_email'
      `;
    } else {
      // Insert new setting
      await sql`
        INSERT INTO email_setting_values (setting_key, value, description, created_at, updated_at)
        VALUES ('default_test_email', ${body.default_test_email}, 'Default email address for SMTP testing', NOW(), NOW())
      `;
    }

    console.log(
      `[Email Settings] Default test email updated: ${body.default_test_email}`
    );

    return c.json({
      success: true,
      message: "Default test email saved successfully",
      data: {
        default_test_email: body.default_test_email,
      },
    });
  } catch (error) {
    console.error("[Email Settings] Save test email error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to save default test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
