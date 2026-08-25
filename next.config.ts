import type { NextConfig } from 'next';

// `standalone` makes vinext emit dist/standalone/server.js, a plain Node server.
// That is what the Vercel target runs. The Cloudflare target ignores it.
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
