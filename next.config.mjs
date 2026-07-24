/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sharp is a native dep used only in server route handlers
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
