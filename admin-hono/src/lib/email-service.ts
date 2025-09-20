/**
 * PlazaCMS Email Service with Resend Integration
 * Handles all email operations: templates, campaigns, and transactional emails
 */

import { Resend } from "resend";
import { WorkerMailer } from "worker-mailer";
import { createMimeMessage } from "mimetext";
import { getDb } from "./db";
import {
  createSMTPRotationService,
  SMTPRotationService,
  DecryptedSMTPAccount,
} from "./smtp-rotation-service";
import {
  createHybridEmailRotationService,
  HybridEmailRotationService,
  UnifiedEmailProvider,
} from "./hybrid-email-rotation-service";
import { SendEmailParams as APIEmailParams } from "./email-api-adapters";

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
  // Rotation/SMTP fields
  smtp_account_id?: string;
  smtp_account_name?: string;
  rotation_strategy?: string;
  attempt_count?: number;
  was_fallback?: boolean;
  response_time_ms?: number;
}

interface EmailSettings {
  provider: "resend" | "smtp" | "cloudflare" | "multi_smtp" | "hybrid";
  from_name: string;
  from_email: string;
  resend_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_encryption?: string;
  // Multi-SMTP settings
  multi_smtp_enabled?: boolean;
  multi_smtp_fallback_enabled?: boolean;
  // Hybrid rotation settings
  hybrid_rotation_enabled?: boolean;
  include_api_providers?: boolean;
}

export class EmailService {
  private resend?: Resend;
  private sql: any;
  private settings: EmailSettings;
  private env?: any; // Cloudflare Workers environment
  private rotationService?: SMTPRotationService;
  private hybridRotationService?: HybridEmailRotationService;

  constructor(settings: EmailSettings, sql: any, env?: any) {
    this.settings = settings;
    this.sql = sql;
    this.env = env;

    // Initialize provider-specific clients
    if (settings.provider === "resend" && settings.resend_api_key) {
      this.resend = new Resend(settings.resend_api_key);
    }

    // Initialize multi-SMTP rotation service if enabled
    if (settings.multi_smtp_enabled || settings.provider === "multi_smtp") {
      this.rotationService = createSMTPRotationService(sql);
    }

    // Initialize hybrid rotation service if enabled
    if (
      settings.hybrid_rotation_enabled ||
      settings.provider === "hybrid" ||
      settings.include_api_providers
    ) {
      this.hybridRotationService = createHybridEmailRotationService(sql);
      console.log("[EmailService] Hybrid rotation service initialized");
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
    if (
      this.settings.provider === "hybrid" ||
      this.settings.hybrid_rotation_enabled ||
      this.settings.include_api_providers
    ) {
      return this.sendViaHybrid(options);
    } else if (this.settings.provider === "resend") {
      return this.sendViaResend(options);
    } else if (this.settings.provider === "smtp") {
      return this.sendViaWorkerMailer(options);
    } else if (this.settings.provider === "cloudflare") {
      return this.sendViaCloudflare(options);
    } else if (
      this.settings.provider === "multi_smtp" ||
      this.settings.multi_smtp_enabled
    ) {
      return this.sendViaMultiSMTP(options);
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
   * 🔄 Send email via Multi-SMTP Load Balancing
   */
  private async sendViaMultiSMTP(options: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    template?: EmailTemplate;
  }): Promise<any> {
    if (!this.rotationService) {
      throw new Error("Multi-SMTP rotation service not initialized");
    }

    const maxAttempts = 3; // Max retry attempts
    const excludedAccounts: string[] = [];
    let lastError: any = null;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        // Get next available SMTP account
        const smtpAccount = await this.rotationService.getNextAccount(
          excludedAccounts
        );

        if (!smtpAccount) {
          // No available accounts, try fallback if enabled
          if (this.settings.multi_smtp_fallback_enabled) {
            console.warn(
              "[MultiSMTP] No SMTP accounts available, falling back to single provider"
            );
            return this.fallbackToSingleProvider(options);
          } else {
            throw new Error("No available SMTP accounts for sending email");
          }
        }

        console.log(
          `[MultiSMTP] Attempt ${attempt}: Using account ${smtpAccount.name} (${smtpAccount.host})`
        );

        // Record start time for performance tracking
        const startTime = Date.now();

        try {
          // Send via selected SMTP account using WorkerMailer
          const result = await WorkerMailer.send(
            {
              host: smtpAccount.host,
              port: smtpAccount.port,
              secure: smtpAccount.encryption === "ssl",
              startTls: smtpAccount.encryption === "tls",
              credentials: {
                username: smtpAccount.username,
                password: smtpAccount.password, // Already decrypted by rotation service
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

          const responseTime = Date.now() - startTime;

          // Mark account as successful
          await this.rotationService.markSuccess(
            smtpAccount.id,
            `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            responseTime,
            Array.isArray(options.to) ? options.to[0] : options.to,
            options.subject
          );

          // Return success result
          return {
            data: {
              id: `multi_smtp_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              account_name: smtpAccount.name,
              account_host: smtpAccount.host,
              response_time_ms: responseTime,
              attempt: attempt,
            },
          };
        } catch (smtpError) {
          const responseTime = Date.now() - startTime;

          // Mark account as failed
          await this.rotationService.markFailure(
            smtpAccount.id,
            smtpError instanceof Error
              ? smtpError
              : new Error(String(smtpError)),
            responseTime,
            Array.isArray(options.to) ? options.to[0] : options.to,
            options.subject
          );

          // Exclude this account from next attempts
          excludedAccounts.push(smtpAccount.id);
          lastError = smtpError;

          console.warn(
            `[MultiSMTP] Account ${smtpAccount.name} failed:`,
            smtpError
          );

          // Continue to next attempt
          continue;
        }
      } catch (error) {
        console.error(`[MultiSMTP] Attempt ${attempt} error:`, error);
        lastError = error;

        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s delay
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed, try fallback if enabled
    if (this.settings.multi_smtp_fallback_enabled) {
      console.warn(
        "[MultiSMTP] All SMTP accounts failed, falling back to single provider"
      );
      try {
        return await this.fallbackToSingleProvider(options);
      } catch (fallbackError) {
        console.error("[MultiSMTP] Fallback also failed:", fallbackError);
        return { error: fallbackError };
      }
    }

    // Return the last error
    return {
      error:
        lastError ||
        new Error(`Failed to send email after ${maxAttempts} attempts`),
    };
  }

  /**
   * 🔄 Fallback to single provider when multi-SMTP fails
   */
  private async fallbackToSingleProvider(options: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    template?: EmailTemplate;
  }): Promise<any> {
    // Try providers in order of preference

    // 1. Try Resend if configured
    if (this.settings.resend_api_key) {
      try {
        console.log("[MultiSMTP] Fallback: Trying Resend");
        return await this.sendViaResend(options);
      } catch (error) {
        console.warn("[MultiSMTP] Resend fallback failed:", error);
      }
    }

    // 2. Try single SMTP if configured
    if (
      this.settings.smtp_host &&
      this.settings.smtp_username &&
      this.settings.smtp_password
    ) {
      try {
        console.log("[MultiSMTP] Fallback: Trying single SMTP");
        return await this.sendViaWorkerMailer(options);
      } catch (error) {
        console.warn("[MultiSMTP] Single SMTP fallback failed:", error);
      }
    }

    // 3. Try Cloudflare if available
    if (this.env?.EMAIL_SENDER || this.env?.EMAIL || this.env?.Plazaku) {
      try {
        console.log("[MultiSMTP] Fallback: Trying Cloudflare Email Workers");
        return await this.sendViaCloudflare(options);
      } catch (error) {
        console.warn("[MultiSMTP] Cloudflare fallback failed:", error);
      }
    }

    throw new Error("All fallback providers failed");
  }

  /**
   * 🔄 Send email via Hybrid Rotation (API + SMTP)
   */
  private async sendViaHybrid(options: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    template?: EmailTemplate;
  }): Promise<any> {
    if (!this.hybridRotationService) {
      throw new Error("Hybrid rotation service not initialized");
    }

    const maxAttempts = 3; // Max retry attempts
    const excludedProviders: string[] = [];
    let lastError: any = null;
    let attempt = 0;

    console.log("[HybridRotation] Starting hybrid email send process");

    while (attempt < maxAttempts) {
      attempt++;

      try {
        // Get next provider (SMTP or API)
        const provider = await this.hybridRotationService.getNextProvider(
          excludedProviders
        );

        if (!provider) {
          console.warn(
            "[HybridRotation] No providers available, trying fallback"
          );
          return this.fallbackToSingleProvider(options);
        }

        console.log(
          `[HybridRotation] Attempt ${attempt}: Using ${provider.type.toUpperCase()} provider: ${
            provider.name
          }`
        );

        // Convert options to SendEmailParams format for API providers
        const emailParams: APIEmailParams = {
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          // For API providers, don't pass from - let adapter use provider's from_email
          // For SMTP providers, pass global from settings
          ...(provider.type === "api"
            ? {}
            : {
                from: {
                  name: options.fromName,
                  email: options.fromEmail,
                },
              }),
          replyTo: options.replyTo,
          tags: options.template
            ? [
                `source:plazacms`,
                `type:${options.template.type}`,
                `category:${options.template.category}`,
              ]
            : [`source:plazacms`],
        };

        // Record start time for performance tracking
        const startTime = Date.now();

        try {
          let result;

          // Use HybridEmailRotationService for proper logging
          result = await this.hybridRotationService.sendEmail(
            provider,
            emailParams
          );

          const responseTime = result.responseTime || Date.now() - startTime;

          if (result.success) {
            console.log(
              `[HybridRotation] ${provider.type.toUpperCase()} send successful via ${
                provider.name
              } (${responseTime}ms)`
            );

            return {
              data: {
                id: result.messageId || `hybrid_${provider.type}_${Date.now()}`,
                provider_name: provider.name,
                provider_type: provider.type,
                provider_id: provider.id,
                response_time_ms: responseTime,
                attempt: attempt,
              },
            };
          } else {
            throw new Error(
              result.error || `${provider.type.toUpperCase()} send failed`
            );
          }
        } catch (providerError) {
          const responseTime = Date.now() - startTime;

          console.warn(
            `[HybridRotation] Provider ${provider.name} failed:`,
            providerError
          );

          // Exclude this provider from next attempts
          excludedProviders.push(provider.id);
          lastError = providerError;

          // Continue to next attempt
          continue;
        }
      } catch (error) {
        console.error(`[HybridRotation] Attempt ${attempt} error:`, error);
        lastError = error;

        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s delay
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    console.error(
      "[HybridRotation] All hybrid attempts failed, trying final fallback"
    );

    try {
      return await this.fallbackToSingleProvider(options);
    } catch (fallbackError) {
      throw new Error(
        `Hybrid rotation failed after ${maxAttempts} attempts. Last error: ${
          lastError?.message || lastError
        }. Fallback also failed: ${
          fallbackError instanceof Error ? fallbackError.message : fallbackError
        }`
      );
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

      // Log email notification with rotation info
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
        // Rotation/SMTP info from hybrid result
        smtp_account_id:
          emailResult.data?.provider_type === "smtp" &&
          emailResult.data?.provider_id
            ? emailResult.data.provider_id.startsWith("smtp:")
              ? emailResult.data.provider_id.replace("smtp:", "") // Remove "smtp:" prefix
              : emailResult.data.provider_id // Already clean UUID
            : undefined,
        smtp_account_name:
          emailResult.data?.provider_type === "smtp"
            ? emailResult.data?.provider_name
            : undefined,
        rotation_strategy: emailResult.data?.provider_type
          ? "hybrid"
          : undefined,
        attempt_count: emailResult.data?.attempt || 1,
        was_fallback: (emailResult.data?.attempt || 1) > 1,
        response_time_ms: emailResult.data?.response_time_ms || 0,
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
        smtp_account_id: log.smtp_account_id,
        smtp_account_name: log.smtp_account_name,
        rotation_strategy: log.rotation_strategy,
      });

      await this.sql`
        INSERT INTO email_notifications (
          type, recipient_email, subject, content, template_id, campaign_id,
          order_id, order_item_id, status, resend_message_id, error_message,
          sent_at, smtp_account_id, smtp_account_name, rotation_strategy,
          attempt_count, was_fallback, response_time_ms
        ) VALUES (
          ${log.type}, ${log.recipient_email}, ${log.subject}, ${log.content},
          ${log.template_id || null}, ${log.campaign_id || null},
          ${log.order_id || null}, ${log.order_item_id || null}, 
          ${log.status}, ${log.resend_message_id || null}, ${
        log.error_message || null
      },
          ${log.status === "sent" ? new Date() : null},
          ${log.smtp_account_id || null}, ${log.smtp_account_name || null}, 
          ${log.rotation_strategy || null}, ${log.attempt_count || 1},
          ${log.was_fallback || false}, ${log.response_time_ms || 0}
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
    // Multi-SMTP settings
    multi_smtp_enabled: emailSettings?.multi_smtp_enabled || false,
    multi_smtp_fallback_enabled:
      emailSettings?.multi_smtp_fallback_enabled !== false, // Default true
    // Hybrid rotation settings
    hybrid_rotation_enabled: emailSettings?.hybrid_rotation_enabled || false,
    include_api_providers: emailSettings?.include_api_providers || false,
  };

  // Override provider to multi_smtp if multi_smtp_enabled is true
  if (settings.multi_smtp_enabled) {
    settings.provider = "multi_smtp";
    console.log(
      "[EmailService] Multi-SMTP enabled, switching to multi_smtp provider"
    );
  }

  // Override provider to hybrid if hybrid_rotation_enabled is true
  if (settings.hybrid_rotation_enabled || settings.include_api_providers) {
    settings.provider = "hybrid";
    console.log(
      "[EmailService] Hybrid rotation enabled, switching to hybrid provider"
    );
  }

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

  if (settings.provider === "multi_smtp") {
    // Check if there are any active SMTP accounts
    try {
      const smtpAccounts = await sql`
        SELECT COUNT(*) as count FROM smtp_accounts WHERE is_active = TRUE
      `;

      const accountCount = parseInt(smtpAccounts[0]?.count || "0");

      if (accountCount === 0) {
        console.warn(
          "[EmailService] No active SMTP accounts found, multi-SMTP will use fallback"
        );

        // If fallback is disabled and no accounts, throw error
        if (!settings.multi_smtp_fallback_enabled) {
          throw new Error(
            "Multi-SMTP enabled but no active SMTP accounts found and fallback is disabled. Please add SMTP accounts or enable fallback."
          );
        }
      } else {
        console.log(
          `[EmailService] Multi-SMTP initialized with ${accountCount} active accounts`
        );
      }
    } catch (error) {
      console.warn("[EmailService] Error checking SMTP accounts:", error);

      if (!settings.multi_smtp_fallback_enabled) {
        throw new Error(
          "Multi-SMTP enabled but cannot verify SMTP accounts and fallback is disabled."
        );
      }
    }
  }

  // Validate hybrid rotation configuration
  if (settings.provider === "hybrid") {
    try {
      // Check if there are any providers available (SMTP accounts + API providers)
      const [smtpCount, apiCount] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM smtp_accounts WHERE is_active = TRUE`,
        sql`SELECT COUNT(*) as count FROM email_api_providers WHERE is_active = TRUE`,
      ]);

      const smtpAccountCount = parseInt(smtpCount[0]?.count || "0");
      const apiProviderCount = parseInt(apiCount[0]?.count || "0");
      const totalProviders = smtpAccountCount + apiProviderCount;

      if (totalProviders === 0) {
        console.warn(
          "[EmailService] No active providers found for hybrid rotation, will use fallback"
        );

        // Fall back to single provider if available
        if (settings.resend_api_key) {
          console.log("[EmailService] Falling back to Resend");
          settings.provider = "resend";
        } else if (
          settings.smtp_host &&
          settings.smtp_username &&
          settings.smtp_password
        ) {
          console.log("[EmailService] Falling back to single SMTP");
          settings.provider = "smtp";
        } else {
          throw new Error(
            "Hybrid rotation enabled but no active providers found and no fallback configuration available. Please add SMTP accounts, API providers, or configure a single provider."
          );
        }
      } else {
        console.log(
          `[EmailService] Hybrid rotation initialized with ${smtpAccountCount} SMTP accounts and ${apiProviderCount} API providers`
        );
      }
    } catch (error) {
      console.warn("[EmailService] Error checking hybrid providers:", error);
      throw new Error(
        "Hybrid rotation enabled but cannot verify provider availability."
      );
    }
  }

  return new EmailService(settings, sql, c.env);
}
