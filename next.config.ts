import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['recharts'],
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
