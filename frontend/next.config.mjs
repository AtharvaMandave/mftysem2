/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Allow large file uploads (10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
