import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";
import { createEmailService } from "../lib/email-service";

const reviewEmailNotifications = new Hono<{
  Bindings: Env;
  Variables: { user: any };
}>();

// GET /api/admin/reviews/email-templates - Get email templates
reviewEmailNotifications.get(
  "/email-templates",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);

    try {
      const templates = await sql`
      SELECT 
        id,
        name,
        subject,
        content,
        type,
        is_active,
        created_at,
        updated_at
      FROM public.email_templates
      WHERE type IN ('review_request', 'review_reminder', 'review_approved', 'review_rejected')
      ORDER BY type, name
    `;

      return c.json({ templates });
    } catch (err) {
      console.error("[review-email-templates:get]", err);
      return c.json({ error: "Failed to fetch email templates" }, 500);
    }
  }
);

// POST /api/admin/reviews/email-templates - Create email template
reviewEmailNotifications.post(
  "/email-templates",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const body = await c.req.json().catch(() => ({}));

    const { name, subject, content, type, is_active = true } = body;

    if (!name || !subject || !content || !type) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const validTypes = [
      "review_request",
      "review_reminder",
      "review_approved",
      "review_rejected",
    ];
    if (!validTypes.includes(type)) {
      return c.json({ error: "Invalid template type" }, 400);
    }

    try {
      const [template] = await sql`
      INSERT INTO public.email_templates (name, subject, content, type, is_active)
      VALUES (${name}, ${subject}, ${content}, ${type}, ${is_active})
      RETURNING *
    `;

      return c.json({ template });
    } catch (err) {
      console.error("[review-email-templates:create]", err);
      return c.json({ error: "Failed to create email template" }, 500);
    }
  }
);

// PUT /api/admin/reviews/email-templates/:id - Update email template
reviewEmailNotifications.put(
  "/email-templates/:id",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const { id } = c.req.param();
    const body = await c.req.json().catch(() => ({}));

    const { name, subject, content, type, is_active } = body;

    try {
      const [template] = await sql`
      UPDATE public.email_templates
      SET 
        name = COALESCE(${name}, name),
        subject = COALESCE(${subject}, subject),
        content = COALESCE(${content}, content),
        type = COALESCE(${type}, type),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

      if (!template) {
        return c.json({ error: "Template not found" }, 404);
      }

      return c.json({ template });
    } catch (err) {
      console.error("[review-email-templates:update]", err);
      return c.json({ error: "Failed to update email template" }, 500);
    }
  }
);

// DELETE /api/admin/reviews/email-templates/:id - Delete email template
reviewEmailNotifications.delete(
  "/email-templates/:id",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const { id } = c.req.param();

    try {
      const result = await sql`
      DELETE FROM public.email_templates
      WHERE id = ${id}
      RETURNING id
    `;

      if (!result[0]) {
        return c.json({ error: "Template not found" }, 404);
      }

      return c.json({ success: true });
    } catch (err) {
      console.error("[review-email-templates:delete]", err);
      return c.json({ error: "Failed to delete email template" }, 500);
    }
  }
);

// POST /api/admin/reviews/send-email - Send email notification
reviewEmailNotifications.post(
  "/send-email",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const body = await c.req.json().catch(() => ({}));

    const {
      template_id,
      custom_subject,
      custom_content,
      order_id,
      order_item_id,
      customer_email,
      product_name,
    } = body;

    if (!customer_email) {
      return c.json({ error: "Customer email is required" }, 400);
    }

    try {
      let subject = custom_subject;
      let content = custom_content;

      // If template_id is provided, fetch template
      if (template_id) {
        const [template] = await sql`
        SELECT subject, content FROM public.email_templates
        WHERE id = ${template_id} AND is_active = true
      `;

        if (!template) {
          return c.json({ error: "Template not found or inactive" }, 404);
        }

        subject = template.subject;
        content = template.content;
      }

      if (!subject || !content) {
        return c.json({ error: "Subject and content are required" }, 400);
      }

      // Get customer and order details for variable replacement
      let customerName = "Customer";
      let orderNumber = "";
      let reviewLink = "";

      if (order_id) {
        const [order] = await sql`
        SELECT o.order_number, u.name as customer_name
        FROM public.orders o
        LEFT JOIN public.users u ON u.id = o.user_id
        WHERE o.id = ${order_id}
      `;

        if (order) {
          customerName = order.customer_name || "Customer";
          orderNumber = order.order_number;
        }
      }

      // Generate review link (this would be your actual review submission URL)
      if (order_item_id) {
        reviewLink = `${
          c.env?.FRONTEND_URL || "https://yourstore.com"
        }/review/submit?order_item=${order_item_id}`;
      }

      // Replace variables in subject and content
      const variables = {
        "{{customer_name}}": customerName,
        "{{product_name}}": product_name || "Product",
        "{{order_number}}": orderNumber,
        "{{review_link}}": reviewLink,
        "{{store_name}}": c.env?.STORE_NAME || "Your Store",
      };

      let processedSubject = subject;
      let processedContent = content;

      Object.entries(variables).forEach(([key, value]) => {
        processedSubject = processedSubject.replace(
          new RegExp(key, "g"),
          value
        );
        processedContent = processedContent.replace(
          new RegExp(key, "g"),
          value
        );
      });

      // Send email using EmailService with Resend
      const emailService = await createEmailService(c);

      const emailResult = await emailService.sendWithTemplate(
        template_id || "review_request",
        customer_email,
        {
          customer_name: customerName,
          product_name: product_name || "Product",
          order_number: orderNumber,
          review_link: reviewLink,
          store_name: c.env?.STORE_NAME || "Your Store",
        },
        {
          isType: !template_id, // Use type-based lookup if no specific template_id
          customSubject: !template_id ? processedSubject : undefined,
          customContent: !template_id ? processedContent : undefined,
          orderId: order_id,
          orderItemId: order_item_id,
        }
      );

      if (!emailResult.success) {
        console.error("[review-email:send]", emailResult.error);
        return c.json(
          {
            error: "Failed to send email notification",
            details: emailResult.error,
          },
          500
        );
      }

      console.log("Email sent successfully:", {
        to: customer_email,
        messageId: emailResult.messageId,
        subject: processedSubject,
      });

      return c.json({
        success: true,
        message: "Email notification sent successfully",
        email: {
          to: customer_email,
          subject: processedSubject,
          content: processedContent,
        },
      });
    } catch (err) {
      console.error("[review-email:send]", err);
      return c.json({ error: "Failed to send email notification" }, 500);
    }
  }
);

// GET /api/admin/reviews/email-notifications - Get email notification history
reviewEmailNotifications.get(
  "/email-notifications",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const url = new URL(c.req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10))
    );
    const offset = (page - 1) * limit;

    try {
      const notifications = await sql`
      SELECT 
        id,
        type,
        recipient_email,
        subject,
        status,
        sent_at,
        order_id,
        order_item_id
      FROM public.email_notifications
      WHERE type = 'review_request'
      ORDER BY sent_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

      const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM public.email_notifications
      WHERE type = 'review_request'
    `;

      return c.json({
        notifications,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (err) {
      console.error("[review-email-notifications:get]", err);
      return c.json({ error: "Failed to fetch email notifications" }, 500);
    }
  }
);

export default reviewEmailNotifications;
