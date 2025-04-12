import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private",
          },
          {
            key: "X-Robots-Tag",
            value: "none",
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  devIndicators: false,
  // Important: casing matters - using exact hostname from system
  allowedDevOrigins: [
    "localhost:3000",
    "*",
    "*:*"
  ],
};

export default nextConfig;
