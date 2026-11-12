/** @type {import('next').NextConfig} */
const nextConfig = {
  // Site 100% estático: `npm run build` gera a pasta out/, que pode ser
  // hospedada em qualquer lugar (Vercel, Netlify, Cloudflare Pages...).
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["lucide-react"],
};

export default nextConfig;
