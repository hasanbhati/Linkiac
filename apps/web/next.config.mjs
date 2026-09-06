/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Monorepo has mixed @types/react packages between React 18 & React 19
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
