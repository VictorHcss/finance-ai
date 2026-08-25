"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen min-w-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="w-full h-full min-h-0">
              {children}
            </div>
          </main>
          <NewTransactionModal />
        </div>
        <LogoutConfirmDialog />
      </div>
    </ProtectedRoute>
  );
}
