"use client";

import { Bell, LogOut, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { usePathname } from "next/navigation";
import { NotificationBadge, useNotificationsQuery } from "@/features/notifications";
import { NotificationStatus } from "@/features/notifications/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Visão geral das suas finanças" },
  "/notifications": { title: "Notificações", subtitle: "Central de avisos e eventos" },
  "/transactions": { title: "Transações", subtitle: "Histórico financeiro completo" },
  "/planning": { title: "Planejamento", subtitle: "Metas e objetivos financeiros" },
  "/insights": { title: "Insights de IA", subtitle: "Análises inteligentes" },
  "/settings": { title: "Configurações", subtitle: "Personalize sua experiência" },
};

export function Navbar() {
  const { user } = useAuth();
  const { open: openMenu } = useSidebar();
  const pathname = usePathname();
  const unreadCountQuery = useNotificationsQuery(
    { status: NotificationStatus.Unread, page: 1, page_size: 1 },
    { toastOnError: false },
  );
  const unreadCount = unreadCountQuery.data?.total ?? 0;

  const page = pageTitles[pathname] || { title: "", subtitle: "" };

  // Centralizado em <LogoutConfirmDialog />, montado uma única vez em
  // AppLayout — este botão só avisa que o usuário quer sair, e deixa
  // a confirmação/execução do logout num só lugar do sistema.
  const requestLogout = () => {
    window.dispatchEvent(new Event("request-logout"));
  };

  const userInitials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <header
      className="h-14 md:h-16 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Botão que abre o Sidebar no mobile. Antes era um elemento
            "fixed" fora do header, com um top calculado na mão
            (1rem + safe-area) que não tinha nenhuma relação real com a
            altura do header (h-14/h-16) nem com o "items-center" que
            centraliza o título — por isso ficava visualmente torto.
            Agora ele é só mais um item dentro do mesmo flex row do
            header, então herda o alinhamento vertical do título de
            graça, em vez de tentar recriá-lo com um número mágico. */}
        <button
          onClick={openMenu}
          aria-label="Abrir menu"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 leading-none text-zinc-300 shadow-sm active:scale-95 transition-transform lg:hidden"
        >
          <Menu size={20} className="block" />
        </button>
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
        <Link
          href="/notifications"
          className="flex items-center justify-center p-2 hover:bg-zinc-800/70 rounded-xl transition-all duration-200 text-zinc-400 hover:text-zinc-200 relative active:scale-95 focus:outline-none focus:ring-1 focus:ring-zinc-700"
          aria-label="Notificações"
        >
          <Bell size={18} />
          <NotificationBadge
            count={unreadCount}
            className="absolute -top-1 -right-1 md:static md:ml-2 px-1.5 py-0.5 text-[10px]"
          />
        </Link>

        {/* Único lugar do sistema com o avatar/menu do usuário — antes
            existia também no rodapé do Sidebar (duplicado em desktop e
            no drawer mobile). Fica no header, visível em qualquer
            tamanho de tela, e pensado primeiro para o polegar: no
            celular é o canto mais fácil de alcançar com uma mão. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 p-1.5 hover:bg-zinc-800/70 rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-1 focus:ring-zinc-700 ml-1"
              aria-label="Menu do usuário"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-emerald-500/20 ring-1 ring-white/10 shrink-0">
                {userInitials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 sm:w-72 rounded-2xl p-0 overflow-hidden">
            <div className="p-4 border-b border-zinc-800/60">
              <p className="text-sm font-semibold text-zinc-200 truncate tracking-tight">
                {user?.name}
              </p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {user?.email}
              </p>
            </div>
            <div className="p-2">
              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 rounded-xl cursor-pointer"
                >
                  <Settings size={17} />
                  <span className="font-medium">Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={requestLogout}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 rounded-xl cursor-pointer hover:text-rose-400 group"
              >
                <LogOut size={17} className="group-hover:scale-110 transition-transform" />
                <span className="font-medium">Sair</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
