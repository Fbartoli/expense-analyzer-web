import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['recharts'],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
