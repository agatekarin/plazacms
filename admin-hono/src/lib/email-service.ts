/**
 * PlazaCMS Email Service with Resend Integration
 * Handles all email operations: templates, campaigns, and transactional emails
 */

import { Resend } from "resend";
import { WorkerMailer } from "worker-mailer";
import { createMimeMessage } from "mimetext";
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

interface EmailSettings {
  provider: "resend" | "smtp" | "cloudflare";
  from_name: string;
  from_email: string;
  resend_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_encryption?: string;
}

export class EmailService {
  private resend?: Resend;
  private sql: any;
  private settings: EmailSettings;
  private env?: any; // Cloudflare Workers environment

  constructor(settings: EmailSettings, sql: any, env?: any) {
    this.settings = settings;
    this.sql = sql;
    this.env = env;

    // Initialize provider-specific clients
    if (settings.provider === "resend" && settings.resend_api_key) {
      this.resend = new Resend(settings.resend_api_key);
    }
  }

  /**
   * Send email using selected provider
   */
  private async sendEmail(options: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    template?: EmailTemplate;
  }): Promise<any> {
    if (this.settings.provider === "resend") {
      return this.sendViaResend(options);
    } else if (this.settings.provider === "smtp") {
      return this.sendViaWorkerMailer(options);
    } else if (this.settings.provider === "cloudflare") {
      return this.sendViaCloudflare(options);
    } else {
      throw new Error(`Unsupported email provider: ${this.settings.provider}`);
    }
  }

  /**
   * Send email via Resend
   */
  private async sendViaResend(options: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    template?: EmailTemplate;
  }) {
    if (!this.resend) {
      throw new Error("Resend API key not configured");
    }

    return await this.resend.emails.send({
      from: `${options.fromName} <${options.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      tags: [
        { name: "source", value: "plazacms" },
        { name: "type", value: options.template?.type || "custom" },
        {
          name: "category",
          value: options.template?.category || "transactional",
        },
      ],
    });
  }

  /**
   * Send email via WorkerMailer (SMTP)
   */
  private async sendViaWorkerMailer(options: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    template?: EmailTemplate;
  }) {
    const {
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_encryption,
    } = this.settings;

    if (!smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      throw new Error("SMTP configuration incomplete");
    }

    try {
      const result = await WorkerMailer.send(
        {
          host: smtp_host,
          port: smtp_port,
          secure: smtp_encryption === "ssl",
          startTls: smtp_encryption === "tls",
          credentials: {
            username: smtp_username,
            password: smtp_password,
          },
          authType: "plain",
        },
        {
          from: { name: options.fromName, email: options.fromEmail },
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          reply: options.replyTo ? options.replyTo : undefined,
        }
      );

      // WorkerMailer doesn't return an ID like Resend, so we generate one
      return {
        data: {
          id: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Send email via Cloudflare Email Workers
   */
  private async sendViaCloudflare(options: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    template?: EmailTemplate;
  }) {
    // Check for any email binding (common names)
    const emailBinding =
      this.env?.EMAIL_SENDER ||
      this.env?.EMAIL ||
      this.env?.Plazaku ||
      this.env?.MAIL_SENDER;
    if (!emailBinding) {
      throw new Error(
        "Cloudflare Email Workers not configured. Add [[send_email]] binding to wrangler.toml"
      );
    }

    try {
      // Create MIME message using mimetext
      const msg = createMimeMessage();

      // Set sender
      msg.setSender({
        name: options.fromName,
        addr: options.fromEmail,
      });

      // Set recipient
      msg.setRecipient(options.to);

      // Set reply-to if provided
      if (options.replyTo) {
        msg.setHeader("Reply-To", options.replyTo);
      }

      // Set subject
      msg.setSubject(options.subject);

      // Add custom headers
      msg.setHeader("X-Source", "plazacms");
      msg.setHeader("X-Template-Type", options.template?.type || "custom");

      // Add text content
      msg.addMessage({
        contentType: "text/plain",
        data: options.text,
      });

      // Add HTML content if provided
      if (options.html) {
        msg.addMessage({
          contentType: "text/html",
          data: options.html,
        });
      }

      // Create EmailMessage with raw MIME content
      // Note: EmailMessage will be available when deployed to Cloudflare Workers
      // For local development, this will be simulated by wrangler
      const { EmailMessage } = await import("cloudflare:email");
      const emailMessage = new EmailMessage(
        options.fromEmail,
        options.to,
        msg.asRaw()
      );

      const result = await emailBinding.send(emailMessage);

      // Cloudflare Email Workers return format
      return {
        data: {
          id: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      };
    } catch (error) {
      console.error("[sendViaCloudflare] Error:", error);
      return { error };
    }
  }

  /**
   * Replace template variables in content
   */
  private replaceVariables(
    content: string,
    variables: TemplateVariables
  ): string {
    let processedContent = content;

    // Default variables (store_name comes from settings now)
    const defaultVars: TemplateVariables = {
      store_name: this.settings.from_name,
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

      // Process template fields with variable replacement
      const rawFromName = template?.from_name || this.settings.from_name;
      const rawFromEmail = template?.from_email || this.settings.from_email;
      const rawReplyTo = template?.reply_to;

      // Replace variables in template fields
      const fromName = this.replaceVariables(rawFromName, variables);
      const fromEmail = this.replaceVariables(rawFromEmail, variables);
      const replyTo = rawReplyTo
        ? this.replaceVariables(rawReplyTo, variables)
        : undefined;

      // Send email using selected provider
      const emailOptions = {
        fromName,
        fromEmail,
        to: recipientEmail,
        subject: processedSubject,
        text: processedContent,
        html: processedHtmlContent || processedContent.replace(/\n/g, "<br>"),
        replyTo,
        template: template || undefined,
      };

      const emailResult = await this.sendEmail(emailOptions);

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
      const fromName = params.fromName || this.settings.from_name;
      const fromEmail = params.fromEmail || this.settings.from_email;

      // Handle array of recipients by sending to the first one (for now)
      const recipient = Array.isArray(params.to) ? params.to[0] : params.to;

      // Send email using selected provider
      const emailOptions = {
        fromName,
        fromEmail,
        to: recipient,
        subject: params.subject,
        text: params.content,
        html: params.htmlContent || params.content.replace(/\n/g, "<br>"),
        replyTo: params.replyTo,
        template: undefined,
      };

      const emailResult = await this.sendEmail(emailOptions);

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
      console.log("[EmailService] Logging notification:", {
        type: log.type,
        recipient: log.recipient_email,
        subject: log.subject,
        status: log.status,
        messageId: log.resend_message_id,
        templateId: log.template_id,
      });

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
          ${log.status === "sent" ? new Date() : null}
        )
      `;

      console.log("[EmailService] Notification logged successfully");
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
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Overall email analytics
        const stats = await this.sql`
          SELECT 
            COUNT(*) as total_sent,
            COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
          FROM email_notifications
          WHERE created_at >= ${cutoffDate.toISOString()}
        `;

        const events = await this.sql`
          SELECT event_type, COUNT(*) as count
          FROM email_events
          WHERE created_at >= ${cutoffDate.toISOString()}
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
export async function createEmailService(c: any): Promise<EmailService> {
  const sql = getDb(c);

  // Get email settings from database
  const [emailSettings] = await sql`
    SELECT * FROM email_settings 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1
  `;

  // Build settings object with fallbacks to environment variables
  const settings: EmailSettings = {
    provider: emailSettings?.provider || "resend",
    from_name: emailSettings?.from_name || c.env?.STORE_NAME || "PlazaCMS Demo",
    from_email:
      emailSettings?.from_email || c.env?.FROM_EMAIL || "onboarding@resend.dev",
    resend_api_key: emailSettings?.resend_api_key || c.env?.RESEND_API_KEY,
    smtp_host: emailSettings?.smtp_host,
    smtp_port: emailSettings?.smtp_port || 587,
    smtp_username: emailSettings?.smtp_username,
    smtp_password: emailSettings?.smtp_password,
    smtp_encryption: emailSettings?.smtp_encryption || "tls",
  };

  // Validate provider configuration
  if (settings.provider === "resend" && !settings.resend_api_key) {
    throw new Error(
      "Resend API key is required. Configure it in Email Settings or RESEND_API_KEY environment variable."
    );
  }

  if (settings.provider === "smtp") {
    if (
      !settings.smtp_host ||
      !settings.smtp_username ||
      !settings.smtp_password
    ) {
      throw new Error(
        "SMTP configuration incomplete. Please configure host, username, and password in Email Settings."
      );
    }
  }

  if (settings.provider === "cloudflare") {
    const emailBinding =
      c.env?.EMAIL_SENDER ||
      c.env?.EMAIL ||
      c.env?.Plazaku ||
      c.env?.MAIL_SENDER;
    if (!emailBinding) {
      throw new Error(
        "Cloudflare Email Workers not configured. Add [[send_email]] binding to wrangler.toml and set destination_address."
      );
    }
  }

  return new EmailService(settings, sql, c.env);
}
