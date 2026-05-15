import type { NextConfig } from "next";

const nextConfig = {
  // Allow phone's IP to connect to the dev server's WebSockets
  allowedDevOrigins: ['192.168.31.44'],

  // Allow Next.js <Image> to serve images from Cloudinary CDN and Google avatars
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
} as NextConfig;

export default nextConfig;
