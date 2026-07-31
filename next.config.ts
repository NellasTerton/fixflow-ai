import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/demo/crm", destination: "/workspace/leads", permanent: true },
      {
        source: "/api/demo/leads",
        destination: "/api/workspace/leads",
        permanent: true,
      },
      { source: "/demo/:path*", destination: "/workspace/:path*", permanent: true },
      {
        source: "/api/demo/:path*",
        destination: "/api/workspace/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
