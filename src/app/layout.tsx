import { Sidebar } from "@/components/Sidebar";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="bg-zinc-950 text-zinc-50 flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          {children}
          <NewTransactionModal />
        </div>
      </body>
    </html>
  );
}
