import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {(phase: string) => import('next').NextConfig} */
const createNextConfig = (phase) => ({
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Keep dev and build artifacts separate to avoid ENOENT races when build
  // runs while dev server is active.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
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
});

export default createNextConfig;
