/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Evita el warning de cross-origin en dev (Next 16+)
  allowedDevOrigins: [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://192.168.1.154:3001',
  ],
};

export default nextConfig;
