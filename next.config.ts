import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/match/live", destination: "/scoring", permanent: false },
      { source: "/match/break", destination: "/break", permanent: false },
      { source: "/match/summary", destination: "/summary", permanent: false },
    ];
  },
};

export default nextConfig;
