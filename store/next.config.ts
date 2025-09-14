import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.plazaku.my.id",
      },
    ],
  },
};

export default nextConfig;
