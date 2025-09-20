/**
 * 📧 Email API Provider Adapters
 *
 * Unified interface for different email API providers:
 * - Resend API
 * - Brevo (Sendinblue) API
 * - Mailjet API v3.1
 *
 * Each adapter handles provider-specific implementation details
 * while providing a consistent interface for the rotation service.
 */

import { Resend } from "resend";

// Cross-platform base64 encoding
function toBase64(input: string): string {
  // Check if global Buffer is available (Node.js environment)
  if (typeof globalThis !== "undefined" && (globalThis as any).Buffer) {
    // Node.js environment
    return (globalThis as any).Buffer.from(input).toString("base64");
  } else if (typeof btoa !== "undefined") {
    // Browser environment
    return btoa(input);
  } else {
    // Fallback - manual base64 encoding
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;

    while (i < input.length) {
      const a = input.charCodeAt(i++);
      const b = i < input.length ? input.charCodeAt(i++) : 0;
      const c = i < input.length ? input.charCodeAt(i++) : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += chars.charAt((bitmap >> 6) & 63);
      result += chars.charAt(bitmap & 63);
    }

    // Pad with '=' characters
    const padding = input.length % 3;
    if (padding === 1) {
      result = result.slice(0, -2) + "==";
    } else if (padding === 2) {
      result = result.slice(0, -1) + "=";
    }

    return result;
  }
}

// Type definitions for API responses
interface BrevoApiResponse {
  messageId?: string;
  message?: string;
  code?: string;
}

interface MailjetApiResponse {
  ErrorMessage?: string;
  ErrorCode?: string;
  Messages?: Array<{
    To?: Array<{
      MessageID?: number;
    }>;
  }>;
}

interface MailjetMessage {
  From: {
    Email: string;
    Name: string;
  };
  To: Array<{ Email: string }>;
  Subject: string;
  HTMLPart?: string;
  TextPart?: string;
  ReplyTo?: { Email: string };
  Headers?: Record<string, string>;
  Attachments?: Array<{
    ContentType: string;
    Filename: string;
    Base64Content: string;
  }>;
}

// Common types for all providers
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: {
    name?: string;
    email: string;
  };
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
  tags?: string[];
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  responseTime?: number;
  providerResponse?: any;
}

export interface ProviderUsageStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}

export interface ProviderHealthStatus {
  healthy: boolean;
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

/**
 * 📧 Base Email API Provider Interface
 */
export interface EmailAPIProviderAdapter {
  readonly providerType: "resend" | "brevo" | "mailjet";
  readonly name: string;

  // Core functionality
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>;
  checkHealth(): Promise<ProviderHealthStatus>;
  validateConfig(): Promise<boolean>;

  // Analytics (optional)
  getUsageStats?(days?: number): Promise<ProviderUsageStats>;
}

/**
 * 🔄 Resend API Adapter
 */
export class ResendAdapter implements EmailAPIProviderAdapter {
  readonly providerType = "resend" as const;
  readonly name: string;
  private resend: Resend;
  private config: any;

  constructor(name: string, apiKey: string, config: any = {}) {
    this.name = name;
    this.resend = new Resend(apiKey);
    this.config = config;
  }

  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    const startTime = Date.now();

    try {
      // Prepare Resend-specific payload
      let fromField: string;

      if (typeof params.from === "string") {
        // If from is already a string, use it directly
        fromField = params.from;
      } else if (params.from && typeof params.from === "object") {
        // If from is an object with name and email
        const name = params.from.name?.trim();
        const email = params.from.email;

        if (name && name.length > 0 && email) {
          // Escape any quotes and special characters in name
          const safeName = name.replace(/[<>"]/g, "");
          fromField = `${safeName} <${email}>`;
        } else if (email) {
          // Always include a name for Resend compatibility
          fromField = `PlazaCMS <${email}>`;
        } else {
          // Fallback with name format
          const fallbackEmail =
            this.config.from_email || "noreply@plazaku.my.id";
          fromField = `PlazaCMS <${fallbackEmail}>`;
        }
      } else {
        // Use provider's configured from_email with default name
        const email = this.config.from_email || "noreply@plazaku.my.id";
        fromField = `PlazaCMS <${email}>`;
      }

      const resendParams: any = {
        from: fromField,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject?.trim() || "No Subject",
      };

      // Resend requires at least one of html or text
      if (params.html) {
        resendParams.html = params.html;
      }
      if (params.text) {
        resendParams.text = params.text;
      }

      // Ensure we have at least text content
      if (!resendParams.html && !resendParams.text) {
        resendParams.text = "Email content not provided";
      }

      if (params.replyTo) resendParams.reply_to = params.replyTo;
      if (params.headers) resendParams.headers = params.headers;

      // NOTE: Resend doesn't support tags, so we don't include them in the payload
      // Tags are for internal tracking only

      // Handle attachments
      if (params.attachments && params.attachments.length > 0) {
        resendParams.attachments = params.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        }));
      }

      // Debug log for troubleshooting - show actual payload sent to Resend
      console.log(`[ResendAdapter] Sending to Resend API:`, {
        from: resendParams.from,
        to: resendParams.to,
        subject: resendParams.subject,
        html: resendParams.html
          ? `${resendParams.html.substring(0, 100)}...`
          : undefined,
        text: resendParams.text
          ? `${resendParams.text.substring(0, 100)}...`
          : undefined,
        reply_to: resendParams.reply_to,
        attachments: resendParams.attachments?.length || 0,
      });

      const result = await this.resend.emails.send(resendParams);

      const responseTime = Date.now() - startTime;

      if (result.error) {
        console.log(`[ResendAdapter] API Error:`, result.error);
        return {
          success: false,
          error: result.error.message || String(result.error),
          errorCode: result.error.name || "RESEND_ERROR",
          responseTime,
          providerResponse: result,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
        responseTime,
        providerResponse: result,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      console.log(`[ResendAdapter] Exception caught:`, {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        response: error.response?.data,
      });

      return {
        success: false,
        error: error.message || "Unknown Resend error",
        errorCode: error.code || error.name || "RESEND_ERROR",
        responseTime,
        providerResponse: error.response?.data || error,
      };
    }
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      // Simple health check - validate API key by getting domains
      const result = await this.resend.domains.list();
      const responseTime = Date.now() - startTime;

      return {
        healthy: !result.error,
        responseTime,
        error: result.error?.message,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        responseTime,
        error: error.message || "Resend health check failed",
        lastCheck: new Date(),
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.healthy;
    } catch {
      return false;
    }
  }
}

/**
 * 📨 Brevo (Sendinblue) API Adapter
 */
export class BrevoAdapter implements EmailAPIProviderAdapter {
  readonly providerType = "brevo" as const;
  readonly name: string;
  private apiKey: string;
  private baseUrl: string;
  private config: any;

  constructor(name: string, apiKey: string, config: any = {}) {
    this.name = name;
    this.apiKey = apiKey;
    this.baseUrl = config.baseUrl || "https://api.brevo.com/v3";
    this.config = config;
  }

  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    const startTime = Date.now();

    try {
      // Prepare Brevo-specific payload
      const brevoParams: any = {
        sender: {
          name: params.from?.name || this.config.from_name || "PlazaCMS",
          email:
            params.from?.email ||
            this.config.from_email ||
            "noreply@plazaku.my.id",
        },
        to: Array.isArray(params.to)
          ? params.to.map((email) => ({ email }))
          : [{ email: params.to }],
        subject: params.subject,
      };

      if (params.html) brevoParams.htmlContent = params.html;
      if (params.text) brevoParams.textContent = params.text;
      if (params.replyTo) brevoParams.replyTo = { email: params.replyTo };
      if (params.tags) brevoParams.tags = params.tags;
      if (params.headers) brevoParams.headers = params.headers;

      // Handle attachments
      if (params.attachments && params.attachments.length > 0) {
        brevoParams.attachment = params.attachments.map((att) => ({
          name: att.filename,
          content: att.content,
        }));
      }

      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(brevoParams),
      });

      const responseTime = Date.now() - startTime;
      const result = (await response.json()) as BrevoApiResponse;

      if (!response.ok) {
        return {
          success: false,
          error: result.message || `Brevo API error: ${response.status}`,
          errorCode: result.code || `HTTP_${response.status}`,
          responseTime,
          providerResponse: result,
        };
      }

      return {
        success: true,
        messageId: result.messageId,
        responseTime,
        providerResponse: result,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message || "Unknown Brevo error",
        errorCode: "BREVO_ERROR",
        responseTime,
        providerResponse: error,
      };
    }
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      // Health check by getting account info
      const response = await fetch(`${this.baseUrl}/account`, {
        method: "GET",
        headers: {
          accept: "application/json",
          "api-key": this.apiKey,
        },
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          healthy: false,
          responseTime,
          error: `Brevo API health check failed: ${response.status}`,
          lastCheck: new Date(),
        };
      }

      return {
        healthy: true,
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        responseTime,
        error: error.message || "Brevo health check failed",
        lastCheck: new Date(),
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.healthy;
    } catch {
      return false;
    }
  }
}

/**
 * ✈️ Mailjet API v3.1 Adapter
 */
export class MailjetAdapter implements EmailAPIProviderAdapter {
  readonly providerType = "mailjet" as const;
  readonly name: string;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private config: any;

  constructor(
    name: string,
    apiKey: string,
    apiSecret: string,
    config: any = {}
  ) {
    this.name = name;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = config.baseUrl || "https://api.mailjet.com/v3.1";
    this.config = config;
  }

  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    const startTime = Date.now();

    try {
      // Prepare Mailjet message
      const mailjetMessage: MailjetMessage = {
        From: {
          Email:
            params.from?.email ||
            this.config.from_email ||
            "noreply@plazaku.my.id",
          Name: params.from?.name || this.config.from_name || "PlazaCMS",
        },
        To: Array.isArray(params.to)
          ? params.to.map((email) => ({ Email: email }))
          : [{ Email: params.to }],
        Subject: params.subject,
      };

      // Add optional content
      if (params.html) mailjetMessage.HTMLPart = params.html;
      if (params.text) mailjetMessage.TextPart = params.text;
      if (params.replyTo) mailjetMessage.ReplyTo = { Email: params.replyTo };
      if (params.headers) mailjetMessage.Headers = params.headers;

      // Handle attachments
      if (params.attachments && params.attachments.length > 0) {
        mailjetMessage.Attachments = params.attachments.map((att) => ({
          ContentType: att.contentType,
          Filename: att.filename,
          Base64Content: att.content,
        }));
      }

      // Prepare Mailjet-specific payload (v3.1 format)
      const mailjetParams = {
        Messages: [mailjetMessage],
      };

      // Create basic auth header
      const auth = toBase64(`${this.apiKey}:${this.apiSecret}`);

      const response = await fetch(`${this.baseUrl}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(mailjetParams),
      });

      const responseTime = Date.now() - startTime;
      const result = (await response.json()) as MailjetApiResponse;

      if (!response.ok) {
        return {
          success: false,
          error: result.ErrorMessage || `Mailjet API error: ${response.status}`,
          errorCode: result.ErrorCode || `HTTP_${response.status}`,
          responseTime,
          providerResponse: result,
        };
      }

      // Extract message ID from Mailjet response
      const messageId = result.Messages?.[0]?.To?.[0]?.MessageID?.toString();

      return {
        success: true,
        messageId,
        responseTime,
        providerResponse: result,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message || "Unknown Mailjet error",
        errorCode: "MAILJET_ERROR",
        responseTime,
        providerResponse: error,
      };
    }
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      // Health check by getting sender information
      const auth = toBase64(`${this.apiKey}:${this.apiSecret}`);

      const response = await fetch(
        `${this.baseUrl.replace("v3.1", "v3")}/sender`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          healthy: false,
          responseTime,
          error: `Mailjet API health check failed: ${response.status}`,
          lastCheck: new Date(),
        };
      }

      return {
        healthy: true,
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        healthy: false,
        responseTime,
        error: error.message || "Mailjet health check failed",
        lastCheck: new Date(),
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.healthy;
    } catch {
      return false;
    }
  }
}

/**
 * 🏭 Provider Adapter Factory
 */
export function createProviderAdapter(
  providerType: "resend" | "brevo" | "mailjet",
  name: string,
  apiKey: string,
  apiSecret?: string,
  config: any = {}
): EmailAPIProviderAdapter {
  switch (providerType) {
    case "resend":
      return new ResendAdapter(name, apiKey, config);

    case "brevo":
      return new BrevoAdapter(name, apiKey, config);

    case "mailjet":
      if (!apiSecret) {
        throw new Error("Mailjet requires both API key and API secret");
      }
      return new MailjetAdapter(name, apiKey, apiSecret, config);

    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

/**
 * 🧪 Test provider functionality
 */
export async function testProviderAdapter(
  adapter: EmailAPIProviderAdapter,
  testEmail: string
): Promise<{
  health: ProviderHealthStatus;
  configValid: boolean;
  testEmailResult?: EmailSendResult;
}> {
  try {
    // Check health
    const health = await adapter.checkHealth();

    // Validate configuration
    const configValid = await adapter.validateConfig();

    // Send test email (optional)
    let testEmailResult: EmailSendResult | undefined;
    if (configValid && testEmail) {
      testEmailResult = await adapter.sendEmail({
        to: testEmail,
        subject: `Test Email from ${adapter.name} (${adapter.providerType})`,
        html: `
          <h3>✅ Test Email Successful</h3>
          <p>This is a test email sent from <strong>${adapter.name}</strong> using the <strong>${adapter.providerType}</strong> provider.</p>
          <p>If you received this email, the provider configuration is working correctly.</p>
          <hr>
          <small>PlazaCMS Email API Rotation System</small>
        `,
        text: `Test Email from ${adapter.name} (${adapter.providerType})\n\nThis is a test email to verify the provider configuration is working correctly.\n\nPlazaCMS Email API Rotation System`,
      });
    }

    return {
      health,
      configValid,
      testEmailResult,
    };
  } catch (error) {
    return {
      health: {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
        lastCheck: new Date(),
      },
      configValid: false,
    };
  }
}
