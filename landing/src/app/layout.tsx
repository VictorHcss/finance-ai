import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const description =
  "Transações, metas e insights que explicam cada mudança nos seus gastos — com números, não com palpites. Grátis para começar.";

export const metadata: Metadata = {
  title: "Finance.AI — seu dinheiro, finalmente claro",
  description,
  openGraph: {
    title: "Finance.AI — seu dinheiro, finalmente claro",
    description,
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c1311",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans antialiased selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}
