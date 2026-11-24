import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // local testing uses learn.localhost / admin.localhost (separate cookies per host, like production)
  allowedDevOrigins: ['learn.localhost', 'admin.localhost'],
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};

export default nextConfig;
