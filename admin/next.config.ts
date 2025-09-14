import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs', 'pg', 'pg-connection-string', 'pgpass', 'split2'],
  /* config options here */
};

export default nextConfig;
