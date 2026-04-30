import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.rankedboost.com',
      },
      {
        protocol: 'https',
        hostname: 's3.pokeos.com',
      },
      {
        protocol: 'https',
        hostname: 'www.serebii.net',
      },
    ],
  },
};

export default nextConfig;
