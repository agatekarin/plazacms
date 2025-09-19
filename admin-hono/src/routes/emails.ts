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

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let whereClause = sql`WHERE created_at >= ${cutoffDate.toISOString()}`;
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

    const emailService = await createEmailService(c);

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

    const emailService = await createEmailService(c);
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
      template_id,
      template_type = "welcome",
    } = body;

    const emailService = await createEmailService(c);

    let result;
    if (template_id) {
      // Template preview: use specific template ID (uses template's own from_name/from_email)
      result = await emailService.sendWithTemplate(template_id, email, {
        customer_name: "Test User",
        store_name: "PlazaCMS Demo", // Will be replaced by template's from_name if set
        order_number: "TEST-001",
        product_name: "Test Product",
        order_total: "$99.99",
        review_link: "https://plazacms.com/review/test",
        tracking_url: "https://track.example.com/TEST001",
        unsubscribe_url: "https://plazacms.com/unsubscribe",
        store_url: "https://plazacms.com",
        customer_email: email,
      });
    } else {
      // General test: use template type (uses email settings from database)
      result = await emailService.sendWithTemplate(
        template_type,
        email,
        {
          customer_name: "Test User",
          store_name: "PlazaCMS Demo",
          order_number: "TEST-001",
          product_name: "Test Product",
        },
        { isType: true }
      );
    }

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

// ============================================================================
// EMAIL ANALYTICS
// ============================================================================

// GET /api/admin/emails/analytics - Get email analytics data
emails.get("/analytics", adminMiddleware as any, async (c) => {
  try {
    const { days = "30" } = c.req.query();
    const dayCount = parseInt(days);

    const sql = getDb(c);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dayCount);

    // Get overview statistics
    const [overviewStats] = await sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM email_notifications 
      WHERE created_at >= ${cutoffDate.toISOString()}
    `;

    // Get event statistics
    const eventStats = await sql`
      SELECT event_type, COUNT(*) as count
      FROM email_events
      WHERE created_at >= ${cutoffDate.toISOString()}
      GROUP BY event_type
    `;

    // Get daily statistics for chart
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
        0 as opened,
        0 as clicked
      FROM email_notifications
      WHERE created_at >= ${cutoffDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get top templates
    const topTemplates = await sql`
      SELECT 
        et.name as template_name,
        COUNT(en.id) as sent_count,
        COALESCE(
          (COUNT(CASE WHEN ee.event_type = 'opened' THEN 1 END)::float / 
           COUNT(en.id)::float * 100), 0
        ) as open_rate,
        COALESCE(
          (COUNT(CASE WHEN ee.event_type = 'clicked' THEN 1 END)::float / 
           COUNT(en.id)::float * 100), 0
        ) as click_rate
      FROM email_notifications en
      LEFT JOIN email_templates et ON en.template_id = et.id
      LEFT JOIN email_events ee ON en.id = ee.notification_id
      WHERE en.created_at >= ${cutoffDate.toISOString()}
        AND et.name IS NOT NULL
      GROUP BY et.name, et.id
      ORDER BY sent_count DESC
      LIMIT 10
    `;

    // Get recent events
    const recentEvents = await sql`
      SELECT 
        ee.event_type,
        en.recipient_email,
        et.name as template_name,
        ee.created_at
      FROM email_events ee
      JOIN email_notifications en ON ee.notification_id = en.id
      LEFT JOIN email_templates et ON en.template_id = et.id
      WHERE ee.created_at >= ${new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString()}
      ORDER BY ee.created_at DESC
      LIMIT 20
    `;

    // Process event statistics
    const eventCounts = eventStats.reduce((acc: any, stat: any) => {
      acc[stat.event_type] = parseInt(stat.count);
      return acc;
    }, {});

    const totalSent = parseInt(overviewStats.total_sent) || 0;
    const delivered = parseInt(overviewStats.delivered) || 0;
    const failed = parseInt(overviewStats.failed) || 0;
    const opened = eventCounts.opened || 0;
    const clicked = eventCounts.clicked || 0;
    const bounced = eventCounts.bounced || 0;
    const unsubscribed = eventCounts.unsubscribed || 0;

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;

    // Process daily data for chart
    const chartDaily = dailyStats.map((day: any) => ({
      date: day.date,
      sent: parseInt(day.sent),
      delivered: parseInt(day.delivered),
      opened: 0, // Could be enhanced with join to events
      clicked: 0, // Could be enhanced with join to events
    }));

    // Mock campaign data (could be enhanced with actual campaign table)
    const campaignData = [
      {
        name: "Welcome Series",
        sent: Math.floor(totalSent * 0.3),
        opened: Math.floor(opened * 0.4),
        clicked: Math.floor(clicked * 0.3),
      },
      {
        name: "Newsletter",
        sent: Math.floor(totalSent * 0.5),
        opened: Math.floor(opened * 0.4),
        clicked: Math.floor(clicked * 0.5),
      },
      {
        name: "Product Updates",
        sent: Math.floor(totalSent * 0.2),
        opened: Math.floor(opened * 0.2),
        clicked: Math.floor(clicked * 0.2),
      },
    ];

    const analyticsData = {
      overview: {
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        unsubscribed,
        deliveryRate: parseFloat(deliveryRate.toFixed(1)),
        openRate: parseFloat(openRate.toFixed(1)),
        clickRate: parseFloat(clickRate.toFixed(1)),
        bounceRate: parseFloat(bounceRate.toFixed(1)),
      },
      chartData: {
        daily: chartDaily,
        campaigns: campaignData,
      },
      topTemplates: topTemplates.map((t: any) => ({
        template_name: t.template_name,
        sent_count: parseInt(t.sent_count),
        open_rate: parseFloat(t.open_rate) || 0,
        click_rate: parseFloat(t.click_rate) || 0,
      })),
      recentEvents: recentEvents.map((e: any) => ({
        event_type: e.event_type,
        recipient_email: e.recipient_email,
        template_name: e.template_name,
        created_at: e.created_at,
      })),
    };

    return c.json(analyticsData);
  } catch (err) {
    console.error("[emails:analytics]", err);
    return c.json({ error: "Failed to fetch analytics data" }, 500);
  }
});

export { emails };
