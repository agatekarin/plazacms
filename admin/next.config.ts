import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const hono = process.env.NEXT_PUBLIC_API_BASE_URL;
    // Only add rewrites if Hono base URL is configured
    if (!hono) return [] as any;
    return [
      {
        source: "/api/authjs/:path*",
        destination: `${hono}/api/authjs/:path*`,
      },
    ];
  },
};

export default nextConfig;
