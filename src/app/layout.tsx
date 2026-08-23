import "./globals.css";
import { AppProviders } from "@/components/providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="bg-zinc-950 text-zinc-50 min-h-screen">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
