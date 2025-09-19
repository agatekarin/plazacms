interface Env {
  HYPERDRIVE: Hyperdrive;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  R2: R2Bucket; // Cloudflare R2 bucket binding
  R2_PUBLIC_URL: string; // Public base URL for R2 assets
  CLOUDINARY_CLOUD_NAME?: string; // Optional: Cloudinary cloud for fetch URLs

  // Email System Configuration
  RESEND_API_KEY: string;
  STORE_NAME?: string;
  FROM_EMAIL?: string;
  FRONTEND_URL?: string;
}
