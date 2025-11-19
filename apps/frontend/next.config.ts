import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces .next/standalone, which the Docker image copies instead of shipping
  // the whole node_modules tree.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Every host a product image may come from has to be listed here or
    // next/image renders nothing. The sample catalogue is local, so the list is
    // empty until a real CDN is wired in.
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    // The sample catalogue is self-hosted SVG. next/image refuses SVG by default
    // because an SVG can carry script, so it is served under a CSP that disables
    // scripts and plugins rather than optimised.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
