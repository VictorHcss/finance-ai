import type { NextConfig } from "next";

// BUILD_TARGET=mobile (usado por `npm run build:mobile`) gera o app como
// arquivos estáticos em out/, que o Capacitor empacota dentro do aplicativo
// Android/iOS. O build normal (Vercel) continua igual.
const isMobileBuild = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  transpilePackages: ["lucide-react", "recharts"],
  ...(isMobileBuild && {
    output: "export",
    // Gera dashboard/index.html em vez de dashboard.html: o servidor local
    // do Capacitor resolve pastas, não arquivos sem extensão.
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
