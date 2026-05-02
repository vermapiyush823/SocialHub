import type { NextConfig } from "next";

const nextConfig = {
  // Allow phone's IP to connect to the dev server's WebSockets
  allowedDevOrigins: ['192.168.31.44'],
} as NextConfig;

export default nextConfig;
