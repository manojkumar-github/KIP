import type { NextConfig } from "next";

const PYTHON_API =
  process.env.KIP_PYTHON_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy /api/* to the Python FastAPI backend so the browser stays same-origin.
    return [
      {
        source: "/api/:path*",
        destination: `${PYTHON_API}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
