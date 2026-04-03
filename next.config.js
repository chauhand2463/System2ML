/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: (
        process.env.ALLOWED_ORIGINS || 
        'localhost:3000,system2-ml.vercel.app,system2ml.vercel.app'
      ).split(',').map(o => o.trim()).filter(Boolean),
    },
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
