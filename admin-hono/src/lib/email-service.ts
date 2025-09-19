/**
 * PlazaCMS Email Service with Resend Integration
 * Handles all email operations: templates, campaigns, and transactional emails
 */

import { Resend } from "resend";
import { getDb } from "./db";

// Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  html_content?: string;
  type: string;
  category: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  is_active: boolean;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  content: string;
  htmlContent?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface TemplateVariables {
  customer_name?: string;
  store_name?: string;
  order_number?: string;
  order_total?: string;
  product_name?: string;
  review_link?: string;
  tracking_url?: string;
  unsubscribe_url?: string;
  [key: string]: any;
}

export interface EmailNotificationLog {
  type: string;
  recipient_email: string;
  subject: string;
  content: string;
  template_id?: string;
  campaign_id?: string;
  order_id?: string;
  order_item_id?: string;
  status: "sent" | "failed" | "pending";
  resend_message_id?: string;
  error_message?: string;
}

export class EmailService {
  private resend: Resend;
  private sql: any;
  private defaultFromEmail: string;
  private defaultFromName: string;

  constructor(
    apiKey: string,
    sql: any,
    defaultFromEmail: string = "noreply@plazacms.com",
    defaultFromName: string = "PlazaCMS"
  ) {
    this.resend = new Resend(apiKey);
    this.sql = sql;
    this.defaultFromEmail = defaultFromEmail;
    this.defaultFromName = defaultFromName;
  }

  /**
   * Replace template variables in content
   */
  private replaceVariables(
    content: string,
    variables: TemplateVariables
  ): string {
    let processedContent = content;

    // Default variables
    const defaultVars: TemplateVariables = {
      store_name: "PlazaCMS",
      store_url: "https://plazacms.com",
      ...variables,
    };

    Object.entries(defaultVars).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        String(value || "")
      );
    });

    return processedContent;
  }

  /**
   * Get email template by ID or type
   */
  async getTemplate(
    idOrType: string,
    isType: boolean = false
  ): Promise<EmailTemplate | null> {
    try {
      let template;

      if (isType) {
        [template] = await this.sql`
          SELECT * FROM email_templates 
          WHERE type = ${idOrType} AND is_active = true 
          ORDER BY is_default DESC, created_at DESC 
          LIMIT 1
        `;
      } else {
        [template] = await this.sql`
          SELECT * FROM email_templates 
          WHERE id = ${idOrType} AND is_active = true
        `;
      }

      return template || null;
    } catch (error) {
      console.error("[EmailService] Error fetching template:", error);
      return null;
    }
  }

  /**
   * Send email using template
   */
  async sendWithTemplate(
    templateIdOrType: string,
    recipientEmail: string,
    variables: TemplateVariables = {},
    options: {
      isType?: boolean;
      customSubject?: string;
      customContent?: string;
      orderId?: string;
      orderItemId?: string;
      campaignId?: string;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      let template: EmailTemplate | null = null;
      let subject = options.customSubject || "";
      let content = options.customContent || "";
      let htmlContent = "";

      // Get template if provided
      if (templateIdOrType) {
        template = await this.getTemplate(templateIdOrType, options.isType);
        if (!template) {
          return { success: false, error: "Template not found or inactive" };
        }

        subject = options.customSubject || template.subject;
        content = options.customContent || template.content;
        htmlContent = template.html_content || "";
      }

      if (!subject || !content) {
        return { success: false, error: "Subject and content are required" };
      }

      // Replace variables
      const processedSubject = this.replaceVariables(subject, variables);
      const processedContent = this.replaceVariables(content, variables);
      const processedHtmlContent = htmlContent
        ? this.replaceVariables(htmlContent, variables)
        : "";

      // Send email via Resend
      const fromName = template?.from_name || this.defaultFromName;
      const fromEmail = template?.from_email || this.defaultFromEmail;
      const replyTo = template?.reply_to;

      const emailResult = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: recipientEmail,
        subject: processedSubject,
        text: processedContent,
        html: processedHtmlContent || processedContent.replace(/\n/g, "<br>"),
        replyTo: replyTo,
        tags: [
          { name: "source", value: "plazacms" },
          { name: "type", value: template?.type || "custom" },
          { name: "category", value: template?.category || "transactional" },
        ],
      });

      // Log email notification
      const notificationLog: EmailNotificationLog = {
        type: template?.type || "custom",
        recipient_email: recipientEmail,
        subject: processedSubject,
        content: processedContent,
        template_id: template?.id,
        campaign_id: options.campaignId,
        order_id: options.orderId,
        order_item_id: options.orderItemId,
        status: "sent",
        resend_message_id: emailResult.data?.id,
      };

      await this.logEmailNotification(notificationLog);

      return {
        success: true,
        messageId: emailResult.data?.id,
      };
    } catch (error) {
      console.error("[EmailService] Send error:", error);

      // Log failed email
      const errorLog: EmailNotificationLog = {
        type: templateIdOrType || "custom",
        recipient_email: recipientEmail,
        subject: options.customSubject || "Email Failed",
        content: options.customContent || "Failed to send email",
        template_id:
          templateIdOrType && !options.isType ? templateIdOrType : undefined,
        campaign_id: options.campaignId,
        order_id: options.orderId,
        order_item_id: options.orderItemId,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      };

      await this.logEmailNotification(errorLog);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  /**
   * Send custom email without template
   */
  async sendCustomEmail(
    params: SendEmailParams
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const fromName = params.fromName || this.defaultFromName;
      const fromEmail = params.fromEmail || this.defaultFromEmail;

      const emailResult = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        text: params.content,
        html: params.htmlContent || params.content.replace(/\n/g, "<br>"),
        replyTo: params.replyTo,
        tags: [
          { name: "source", value: "plazacms" },
          { name: "type", value: "custom" },
          ...(params.tags?.map((tag) => ({ name: "custom", value: tag })) ||
            []),
        ],
      });

      // Log email notification
      const recipients = Array.isArray(params.to) ? params.to : [params.to];
      for (const recipient of recipients) {
        const notificationLog: EmailNotificationLog = {
          type: "custom",
          recipient_email: recipient,
          subject: params.subject,
          content: params.content,
          status: "sent",
          resend_message_id: emailResult.data?.id,
        };

        await this.logEmailNotification(notificationLog);
      }

      return {
        success: true,
        messageId: emailResult.data?.id,
      };
    } catch (error) {
      console.error("[EmailService] Custom email error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  /**
   * Send bulk campaign emails
   */
  async sendCampaign(
    campaignId: string,
    recipients: string[],
    templateId: string,
    variables: TemplateVariables = {}
  ): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
    let sentCount = 0;
    let failedCount = 0;

    // Update campaign status
    await this.sql`
      UPDATE email_campaigns 
      SET status = 'sending', started_at = CURRENT_TIMESTAMP 
      WHERE id = ${campaignId}
    `;

    // Send emails in batches (Resend has rate limits)
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const promises = batch.map(async (email) => {
        const result = await this.sendWithTemplate(
          templateId,
          email,
          variables,
          {
            campaignId,
          }
        );

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update campaign analytics
    await this.sql`
      UPDATE email_campaigns 
      SET 
        status = 'sent',
        completed_at = CURRENT_TIMESTAMP,
        recipient_count = ${recipients.length},
        sent_count = ${sentCount},
        delivered_count = ${sentCount}
      WHERE id = ${campaignId}
    `;

    return { success: true, sentCount, failedCount };
  }

  /**
   * Log email notification to database
   */
  private async logEmailNotification(log: EmailNotificationLog): Promise<void> {
    try {
      await this.sql`
        INSERT INTO email_notifications (
          type, recipient_email, subject, content, template_id, campaign_id,
          order_id, order_item_id, status, resend_message_id, error_message,
          sent_at
        ) VALUES (
          ${log.type}, ${log.recipient_email}, ${log.subject}, ${log.content},
          ${log.template_id || null}, ${log.campaign_id || null},
          ${log.order_id || null}, ${log.order_item_id || null}, 
          ${log.status}, ${log.resend_message_id || null}, ${
        log.error_message || null
      },
          ${log.status === "sent" ? "CURRENT_TIMESTAMP" : null}
        )
      `;
    } catch (error) {
      console.error("[EmailService] Error logging notification:", error);
    }
  }

  /**
   * Handle Resend webhooks for email events
   */
  async handleWebhook(eventData: any): Promise<void> {
    try {
      const { type, data } = eventData;
      const messageId = data?.message_id;

      if (!messageId) return;

      // Find the notification
      const [notification] = await this.sql`
        SELECT id, campaign_id, recipient_email 
        FROM email_notifications 
        WHERE resend_message_id = ${messageId}
      `;

      if (!notification) return;

      // Log the event
      await this.sql`
        INSERT INTO email_events (
          notification_id, campaign_id, event_type, recipient_email,
          resend_event_id, resend_message_id, metadata
        ) VALUES (
          ${notification.id}, ${notification.campaign_id}, ${type},
          ${notification.recipient_email}, ${data.event_id || null},
          ${messageId}, ${JSON.stringify(data)}
        )
      `;

      // Update campaign analytics if applicable
      if (notification.campaign_id) {
        const updateField = this.getAnalyticsField(type);
        if (updateField) {
          await this.sql`
            UPDATE email_campaigns 
            SET ${this.sql(updateField)} = ${this.sql(updateField)} + 1
            WHERE id = ${notification.campaign_id}
          `;
        }
      }
    } catch (error) {
      console.error("[EmailService] Webhook error:", error);
    }
  }

  private getAnalyticsField(eventType: string): string | null {
    switch (eventType) {
      case "delivered":
        return "delivered_count";
      case "opened":
        return "opened_count";
      case "clicked":
        return "clicked_count";
      case "bounced":
        return "bounced_count";
      case "complained":
        return "complained_count";
      case "unsubscribed":
        return "unsubscribed_count";
      default:
        return null;
    }
  }

  /**
   * Get email analytics
   */
  async getAnalytics(campaignId?: string, days: number = 30): Promise<any> {
    try {
      if (campaignId) {
        // Campaign-specific analytics
        const [campaign] = await this.sql`
          SELECT * FROM email_campaigns WHERE id = ${campaignId}
        `;

        const events = await this.sql`
          SELECT event_type, COUNT(*) as count 
          FROM email_events 
          WHERE campaign_id = ${campaignId}
          GROUP BY event_type
        `;

        return { campaign, events };
      } else {
        // Overall email analytics
        const stats = await this.sql`
          SELECT 
            COUNT(*) as total_sent,
            COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
          FROM email_notifications
          WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        `;

        const events = await this.sql`
          SELECT event_type, COUNT(*) as count
          FROM email_events
          WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
          GROUP BY event_type
        `;

        return { stats: stats[0], events };
      }
    } catch (error) {
      console.error("[EmailService] Analytics error:", error);
      return null;
    }
  }
}

/**
 * Factory function to create EmailService instance
 */
export function createEmailService(c: any): EmailService {
  const resendApiKey = c.env?.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY environment variable is required");
  }

  const sql = getDb(c);
  const fromEmail = c.env?.FROM_EMAIL || "noreply@plazacms.com";
  const storeName = c.env?.STORE_NAME || "PlazaCMS";

  return new EmailService(resendApiKey, sql, fromEmail, storeName);
}
