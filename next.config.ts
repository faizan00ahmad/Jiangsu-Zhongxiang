import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets the site open via 127.0.0.1 or a LAN address (phone on the same Wi-Fi).
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  env: { NEXT_PUBLIC_YEAR: String(new Date().getFullYear()) },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
