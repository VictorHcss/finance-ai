import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (\
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-50 flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
