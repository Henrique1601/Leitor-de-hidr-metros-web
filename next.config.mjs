/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
