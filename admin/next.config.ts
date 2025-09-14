import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'pg', 'pg-connection-string', 'pgpass', 'split2'],
  },
  /* config options here */
};

export default nextConfig;
