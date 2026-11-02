/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
};

export default nextConfig;
