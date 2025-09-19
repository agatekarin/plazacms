/**
 * Email Management Routes
 * Handles email templates, campaigns, and Resend webhooks
 */

import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";
import { createEmailService } from "../lib/email-service";

const emails = new Hono<{
  Bindings: Env;
  Variables: { user: any };
}>();

// ============================================================================
// EMAIL TEMPLATES MANAGEMENT
// ============================================================================

// GET /api/admin/emails/templates - Get all email templates
emails.get("/templates", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);

  try {
    const { category, type } = c.req.query();

    let query = sql`
      SELECT 
        id, name, subject, content, html_content, type, category,
        from_name, from_email, reply_to, is_active, is_default,
        created_at, updated_at
      FROM email_templates
    `;

    if (category) {
      query = sql`
        SELECT * FROM email_templates 
        WHERE category = ${category}
        ORDER BY is_default DESC, name ASC
      `;
    } else if (type) {
      query = sql`
        SELECT * FROM email_templates 
        WHERE type = ${type}
        ORDER BY is_default DESC, created_at DESC
      `;
    } else {
      query = sql`
        SELECT * FROM email_templates 
        ORDER BY category, type, is_default DESC, name ASC
      `;
    }

    const templates = await query;
    return c.json({ templates });
  } catch (err) {
    console.error("[emails:templates:get]", err);
    return c.json({ error: "Failed to fetch email templates" }, 500);
  }
});

// GET /api/admin/emails/templates/:id - Get single email template
emails.get("/templates/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const templateId = c.req.param("id");

  try {
    const [template] = await sql`
      SELECT 
        id, name, subject, content, html_content, type, category,
        from_name, from_email, reply_to, is_active, is_default,
        preview_text, tags, version, created_at, updated_at
      FROM email_templates
      WHERE id = ${templateId}
    `;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    return c.json({ template });
  } catch (err) {
    console.error("[emails:templates:get-single]", err);
    return c.json({ error: "Failed to fetch email template" }, 500);
  }
});

// POST /api/admin/emails/templates - Create email template
emails.post("/templates", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = await c.req.json().catch(() => ({}));

  const {
    name,
    subject,
    content,
    html_content,
    type,
    category = "transactional",
    from_name,
    from_email,
    reply_to,
    is_default = false,
  } = body;

  if (!name || !subject || !content || !type) {
    return c.json(
      { error: "Name, subject, content, and type are required" },
      400
    );
  }

  try {
    const [template] = await sql`
      INSERT INTO email_templates (
        name, subject, content, html_content, type, category,
        from_name, from_email, reply_to, is_default, is_active
      ) VALUES (
        ${name}, ${subject}, ${content}, ${html_content || null},
        ${type}, ${category}, ${from_name || null}, ${from_email || null},
        ${reply_to || null}, ${is_default}, true
      ) RETURNING *
    `;

    return c.json({ template });
  } catch (err) {
    console.error("[emails:templates:create]", err);
    return c.json({ error: "Failed to create email template" }, 500);
  }
});

// PUT /api/admin/emails/templates/:id - Update email template
emails.put("/templates/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const templateId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  try {
    const [template] = await sql`
      UPDATE email_templates SET
        name = ${body.name},
        subject = ${body.subject},
        content = ${body.content},
        html_content = ${body.html_content || null},
        type = ${body.type},
        category = ${body.category || "transactional"},
        from_name = ${body.from_name || null},
        from_email = ${body.from_email || null},
        reply_to = ${body.reply_to || null},
        is_default = ${body.is_default || false},
        is_active = ${body.is_active !== undefined ? body.is_active : true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${templateId}
      RETURNING *
    `;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    return c.json({ template });
  } catch (err) {
    console.error("[emails:templates:update]", err);
    return c.json({ error: "Failed to update email template" }, 500);
  }
});

// DELETE /api/admin/emails/templates/:id - Delete email template
emails.delete("/templates/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const templateId = c.req.param("id");

  try {
    const [template] = await sql`
      DELETE FROM email_templates 
      WHERE id = ${templateId}
      RETURNING id
    `;

    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }

    return c.json({ message: "Template deleted successfully" });
  } catch (err) {
    console.error("[emails:templates:delete]", err);
    return c.json({ error: "Failed to delete email template" }, 500);
  }
});

// ============================================================================
// EMAIL ANALYTICS & NOTIFICATIONS
// ============================================================================

// GET /api/admin/emails/analytics - Get email analytics
emails.get("/analytics", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);

  try {
    const days = parseInt(c.req.query("days") || "30");

    // Overall stats
    const [stats] = await sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM email_notifications
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
    `;

    // Email events breakdown
    const events = await sql`
      SELECT event_type, COUNT(*) as count
      FROM email_events
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY event_type
      ORDER BY count DESC
    `;

    // Top email types
    const topTypes = await sql`
      SELECT type, COUNT(*) as count
      FROM email_notifications
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 10
    `;

    // Daily stats (last 7 days)
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered
      FROM email_notifications
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    return c.json({
      stats,
      events,
      topTypes,
      dailyStats,
    });
  } catch (err) {
    console.error("[emails:analytics]", err);
    return c.json({ error: "Failed to fetch email analytics" }, 500);
  }
});

// GET /api/admin/emails/notifications - Get email notification history
emails.get("/notifications", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);

  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const type = c.req.query("type");
    const status = c.req.query("status");

    let whereClause = sql`WHERE 1=1`;
    if (type) whereClause = sql`WHERE type = ${type}`;
    if (status) whereClause = sql`${whereClause} AND status = ${status}`;

    const notifications = await sql`
      SELECT 
        en.*,
        et.name as template_name,
        ec.name as campaign_name
      FROM email_notifications en
      LEFT JOIN email_templates et ON en.template_id = et.id
      LEFT JOIN email_campaigns ec ON en.campaign_id = ec.id
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) as count FROM email_notifications ${whereClause}
    `;

    return c.json({
      notifications,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error("[emails:notifications]", err);
    return c.json({ error: "Failed to fetch email notifications" }, 500);
  }
});

// GET /api/admin/emails/export-history - Export email history
emails.get("/export-history", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);

  try {
    const type = c.req.query("type");
    const status = c.req.query("status");
    const days = parseInt(c.req.query("days") || "30");

    let whereClause = sql`WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'`;
    if (type) whereClause = sql`${whereClause} AND type = ${type}`;
    if (status) whereClause = sql`${whereClause} AND status = ${status}`;

    const notifications = await sql`
      SELECT 
        en.recipient_email,
        en.subject,
        en.type,
        en.status,
        en.sent_at,
        en.created_at,
        en.error_message,
        et.name as template_name,
        ec.name as campaign_name
      FROM email_notifications en
      LEFT JOIN email_templates et ON en.template_id = et.id
      LEFT JOIN email_campaigns ec ON en.campaign_id = ec.id
      ${whereClause}
      ORDER BY created_at DESC
    `;

    // Generate CSV content
    const csvHeader = [
      "Recipient Email",
      "Subject",
      "Type",
      "Status",
      "Sent At",
      "Created At",
      "Template Name",
      "Campaign Name",
      "Error Message",
    ].join(",");

    const csvRows = notifications.map((row: any) =>
      [
        `"${row.recipient_email || ""}"`,
        `"${row.subject || ""}"`,
        `"${row.type || ""}"`,
        `"${row.status || ""}"`,
        `"${row.sent_at || ""}"`,
        `"${row.created_at || ""}"`,
        `"${row.template_name || ""}"`,
        `"${row.campaign_name || ""}"`,
        `"${row.error_message || ""}"`,
      ].join(",")
    );

    const csvContent = [csvHeader, ...csvRows].join("\n");

    // Set headers for CSV download
    c.header("Content-Type", "text/csv");
    c.header(
      "Content-Disposition",
      `attachment; filename="email-history-${
        new Date().toISOString().split("T")[0]
      }.csv"`
    );

    return c.text(csvContent);
  } catch (err) {
    console.error("[emails:export-history]", err);
    return c.json({ error: "Failed to export email history" }, 500);
  }
});

// ============================================================================
// EMAIL SENDING
// ============================================================================

// POST /api/admin/emails/send - Send custom email
emails.post("/send", adminMiddleware as any, async (c) => {
  try {
    const body = await c.req.json();
    const {
      to,
      subject,
      content,
      html_content,
      template_id,
      variables = {},
    } = body;

    if (!to || (!subject && !template_id) || (!content && !template_id)) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const emailService = createEmailService(c);

    let result;
    if (template_id) {
      // Send with template
      result = await emailService.sendWithTemplate(template_id, to, variables);
    } else {
      // Send custom email
      result = await emailService.sendCustomEmail({
        to,
        subject,
        content,
        htmlContent: html_content,
      });
    }

    if (!result.success) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({
      success: true,
      messageId: result.messageId,
      message: "Email sent successfully",
    });
  } catch (err) {
    console.error("[emails:send]", err);
    return c.json({ error: "Failed to send email" }, 500);
  }
});

// ============================================================================
// RESEND WEBHOOKS
// ============================================================================

// POST /api/emails/webhook/resend - Handle Resend webhooks
emails.post("/webhook/resend", async (c) => {
  try {
    const body = await c.req.json();
    console.log("[Resend Webhook]", body);

    const emailService = createEmailService(c);
    await emailService.handleWebhook(body);

    return c.json({ success: true });
  } catch (err) {
    console.error("[emails:webhook:resend]", err);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// ============================================================================
// EMAIL TESTING
// ============================================================================

// POST /api/admin/emails/test - Send test email
emails.post("/test", adminMiddleware as any, async (c) => {
  try {
    const body = await c.req.json();
    const {
      email = c.env?.ADMIN_EMAIL || "admin@example.com",
      template_type = "welcome",
    } = body;

    const emailService = createEmailService(c);

    const result = await emailService.sendWithTemplate(
      template_type,
      email,
      {
        customer_name: "Test User",
        store_name: c.env?.STORE_NAME || "PlazaCMS Demo",
        order_number: "TEST-001",
        product_name: "Test Product",
      },
      { isType: true }
    );

    if (!result.success) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({
      success: true,
      messageId: result.messageId,
      message: `Test email sent to ${email}`,
    });
  } catch (err) {
    console.error("[emails:test]", err);
    return c.json({ error: "Failed to send test email" }, 500);
  }
});

export { emails };
