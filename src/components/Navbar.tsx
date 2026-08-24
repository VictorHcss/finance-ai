"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, LogOut, Cloud, CloudOff } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { NotificationBadge, useNotificationsQuery } from "@/features/notifications";
import { NotificationStatus } from "@/features/notifications/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStorageMode } from "@/lib/storage";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Dashboard", subtitle: "Visão geral das suas finanças" },
  "/notifications": { title: "Notificações", subtitle: "Central de avisos e eventos" },
  "/transactions": { title: "Transações", subtitle: "Histórico financeiro completo" },
  "/planning": { title: "Planejamento", subtitle: "Metas e objetivos financeiros" },
  "/insights": { title: "Insights de IA", subtitle: "Análises inteligentes" },
  "/settings": { title: "Configurações", subtitle: "Personalize sua experiência" },
};

export function Navbar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const pathname = usePathname();
  const storageMode = useStorageMode();
  const unreadCountQuery = useNotificationsQuery(
    { status: NotificationStatus.Unread, page: 1, page_size: 1 },
    { toastOnError: false },
  );
  const unreadCount = unreadCountQuery.data?.total ?? 0;

  const page = pageTitles[pathname] || { title: "", subtitle: "" };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      addToast("success", "Logout realizado com sucesso!");
      router.push("/login");
    } catch {
      addToast("error", "Erro ao fazer logout.");
    }
    setIsUserMenuOpen(false);
  };

  const userInitials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <header className="h-14 md:h-16 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="w-9 md:hidden shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold tracking-tight truncate">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-xs text-zinc-500 truncate hidden sm:block">
              {page.subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <StorageModeBadge mode={storageMode} />
        <Link
          href="/notifications"
          className="hidden md:inline-flex items-center justify-center p-2 hover:bg-zinc-800/70 rounded-xl transition-all duration-200 text-zinc-400 hover:text-zinc-200 relative active:scale-95 focus:outline-none focus:ring-1 focus:ring-zinc-700"
          aria-label="Notificações"
        >
          <Bell size={18} />
          <NotificationBadge
            count={unreadCount}
            className="ml-2 px-1.5 py-0.5 text-[10px]"
          />
        </Link>

        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/notifications"
            className="p-2 hover:bg-zinc-800/70 rounded-xl transition-all duration-200 text-zinc-400 hover:text-zinc-200 relative active:scale-95 focus:outline-none focus:ring-1 focus:ring-zinc-700"
            aria-label="Notificações"
          >
            <Bell size={18} />
            <NotificationBadge
              count={unreadCount}
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px]"
            />
          </Link>

          {/* Menu Usuário Mobile */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-zinc-800/70 rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              aria-label="Menu do usuário"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-emerald-500/20 ring-1 ring-white/10 shrink-0">
                {userInitials}
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                <div className="p-4 border-b border-zinc-800/60">
                  <p className="text-sm font-semibold text-zinc-200 truncate tracking-tight">
                    {user?.name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/70 rounded-xl transition-all duration-200 hover:text-rose-400 group"
                  >
                    <LogOut size={17} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function StorageModeBadge({ mode }: { mode: "api" | "local" | null }) {
  if (!mode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span className="text-[10px] font-medium text-zinc-500 tracking-wide">
              ...
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
          Verificando conexão...
        </TooltipContent>
      </Tooltip>
    );
  }

  const isApi = mode === "api";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 transition-colors cursor-default">
          {isApi ? (
            <Cloud size={12} className="text-emerald-500 shrink-0" />
          ) : (
            <CloudOff size={12} className="text-amber-500 shrink-0" />
          )}
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isApi ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span
            className={`text-[10px] font-medium tracking-wide hidden sm:inline ${
              isApi ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {isApi ? "Conectado" : "Modo local"}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        className="bg-zinc-900 border-zinc-800 text-zinc-300 max-w-[260px]"
      >
        {isApi ? (
          <>
            <p className="font-semibold text-emerald-400 mb-1">
              ● Conectado ao servidor
            </p>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Seus dados estão sendo salvos no banco de dados via API.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-amber-400 mb-1">
              ● Modo local (offline)
            </p>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              API indisponível. Os dados serão salvos apenas neste navegador (localStorage).
            </p>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
