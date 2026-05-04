import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration
  turbopack: {},
  // Webpack configuration for path aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  // Enable API rewrites for cleaner route handling
  async rewrites() {
    return [
      // Auth routes
      {
        source: '/api/auth/send-otp',
        destination: '/api/auth/send-otp',
      },
      {
        source: '/api/auth/verify-otp',
        destination: '/api/auth/verify-otp',
      },
      // Vendor routes
      {
        source: '/api/vendor/:path*',
        destination: '/api/vendor/:path*',
      },
      // Ads routes
      {
        source: '/api/ads/:path*',
        destination: '/api/ads/:path*',
      },
      // Subscription routes
      {
        source: '/api/subscription/:path*',
        destination: '/api/subscription/:path*',
      },
      // Payment routes
      {
        source: '/api/payment/:path*',
        destination: '/api/payment/:path*',
      },
      // Coins routes
      {
        source: '/api/coins/:path*',
        destination: '/api/coins/:path*',
      },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
        ],
      },
    ];
  },
};

export default nextConfig;
