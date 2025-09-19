import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const settingsEmail = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/settings/email
settingsEmail.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);

    const [settings] = await sql`
      SELECT * FROM email_settings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    // Return default settings if none exist
    if (!settings) {
      return c.json({
        success: true,
        settings: {
          from_name: "PlazaCMS Demo",
          from_email: "onboarding@resend.dev",
          reply_to: "",
          resend_api_key: "",
          smtp_host: "",
          smtp_port: 587,
          smtp_username: "",
          smtp_password: "",
          smtp_encryption: "tls",
          provider: "resend",
          is_active: true,
          webhook_url: "",
          webhook_secret: "",
          webhook_events: [
            "email.sent",
            "email.delivered",
            "email.opened",
            "email.clicked",
            "email.bounced",
          ],
        },
      });
    }

    // Don't expose sensitive keys in response
    const safeSettings = {
      ...settings,
      resend_api_key: settings.resend_api_key ? "••••••••••••••••" : "",
      smtp_password: settings.smtp_password ? "••••••••••••••••" : "",
      webhook_secret: settings.webhook_secret ? "••••••••••••••••" : "",
    };

    return c.json({ success: true, settings: safeSettings });
  } catch (error: any) {
    console.error("Failed to load email settings:", error);
    return c.json({ error: "Failed to load email settings" }, 500);
  }
});

// PATCH /api/admin/settings/email
settingsEmail.patch("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json().catch(() => ({}));

    const {
      from_name,
      from_email,
      reply_to,
      resend_api_key,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_encryption,
      provider,
      is_active,
      webhook_url,
      webhook_secret,
      webhook_events,
    } = body;

    // Validation
    if (!from_name || !from_email || !provider) {
      return c.json(
        {
          error: "from_name, from_email, and provider are required",
        },
        400
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(from_email)) {
      return c.json({ error: "Invalid from_email format" }, 400);
    }

    if (reply_to && !emailRegex.test(reply_to)) {
      return c.json({ error: "Invalid reply_to format" }, 400);
    }

    // Check if settings exist
    const existing = await sql`
      SELECT id FROM email_settings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (existing.length === 0) {
      // Create new settings
      const [newSettings] = await sql`
        INSERT INTO email_settings (
          from_name, from_email, reply_to, resend_api_key,
          smtp_host, smtp_port, smtp_username, smtp_password,
          smtp_encryption, provider, is_active, webhook_url, webhook_secret, webhook_events
        ) VALUES (
          ${from_name}, ${from_email}, ${reply_to || null}, ${
        resend_api_key || null
      },
          ${smtp_host || null}, ${smtp_port || 587}, ${
        smtp_username || null
      }, ${smtp_password || null},
          ${smtp_encryption || "tls"}, ${provider}, ${is_active !== false},
          ${webhook_url || null}, ${webhook_secret || null}, ${
        webhook_events || []
      }
        )
        RETURNING *
      `;

      return c.json({ success: true, settings: newSettings });
    } else {
      // Build update object
      const updates: Record<string, any> = {
        updated_at: new Date(),
      };

      // Only update provided fields
      if (from_name !== undefined) updates.from_name = from_name;
      if (from_email !== undefined) updates.from_email = from_email;
      if (reply_to !== undefined) updates.reply_to = reply_to || null;
      if (
        resend_api_key !== undefined &&
        resend_api_key !== "••••••••••••••••"
      ) {
        updates.resend_api_key = resend_api_key || null;
      }
      if (smtp_host !== undefined) updates.smtp_host = smtp_host || null;
      if (smtp_port !== undefined) updates.smtp_port = smtp_port || 587;
      if (smtp_username !== undefined)
        updates.smtp_username = smtp_username || null;
      if (smtp_password !== undefined && smtp_password !== "••••••••••••••••") {
        updates.smtp_password = smtp_password || null;
      }
      if (smtp_encryption !== undefined)
        updates.smtp_encryption = smtp_encryption || "tls";
      if (provider !== undefined) updates.provider = provider;
      if (is_active !== undefined) updates.is_active = is_active !== false;
      if (webhook_url !== undefined) updates.webhook_url = webhook_url || null;
      if (
        webhook_secret !== undefined &&
        webhook_secret !== "••••••••••••••••"
      ) {
        updates.webhook_secret = webhook_secret || null;
      }
      if (webhook_events !== undefined)
        updates.webhook_events = webhook_events || [];

      const [updatedSettings] = await sql`
        UPDATE email_settings 
        SET ${sql(updates)}
        WHERE id = ${existing[0].id}
        RETURNING *
      `;

      return c.json({ success: true, settings: updatedSettings });
    }
  } catch (error: any) {
    console.error("Failed to update email settings:", error);
    return c.json({ error: "Failed to update email settings" }, 500);
  }
});

// POST /api/admin/settings/email/test - Test email configuration
settingsEmail.post("/test", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json().catch(() => ({}));
    const { test_email } = body;

    if (!test_email) {
      return c.json({ error: "test_email is required" }, 400);
    }

    // Get current settings
    const [settings] = await sql`
      SELECT * FROM email_settings 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (!settings) {
      return c.json({ error: "No email settings configured" }, 400);
    }

    // Actually send test email using EmailService
    const { createEmailService } = await import("../lib/email-service");
    const emailService = await createEmailService(c);

    // Test email content
    const testContent = `Hello!

This is a test email from PlazaCMS Email Settings.

If you receive this email, your email configuration is working correctly.

Settings Used:
- Provider: ${settings.provider}
- From: ${settings.from_name} <${settings.from_email}>
${settings.reply_to ? `- Reply To: ${settings.reply_to}` : ""}

Best regards,
PlazaCMS Team`;

    // Send actual test email
    const result = await emailService.sendCustomEmail({
      to: test_email,
      subject: "PlazaCMS Email Configuration Test",
      content: testContent,
      fromName: settings.from_name,
      fromEmail: settings.from_email,
      replyTo: settings.reply_to || undefined,
    });

    if (!result.success) {
      return c.json(
        {
          error: `Test email failed: ${result.error}`,
          settings_used: {
            provider: settings.provider,
            from_name: settings.from_name,
            from_email: settings.from_email,
            reply_to: settings.reply_to,
          },
        },
        500
      );
    }

    return c.json({
      success: true,
      messageId: result.messageId,
      message: `Test email sent to ${test_email}`,
      settings_used: {
        provider: settings.provider,
        from_name: settings.from_name,
        from_email: settings.from_email,
        reply_to: settings.reply_to,
      },
    });
  } catch (error: any) {
    console.error("Failed to test email settings:", error);
    return c.json({ error: "Failed to test email settings" }, 500);
  }
});

export default settingsEmail;
