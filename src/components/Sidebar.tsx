"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Settings,
  BrainCircuit,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Receipt, label: "Transações", href: "/transactions" },
  { icon: Wallet, label: "Planejamento", href: "/planning" },
  { icon: BrainCircuit, label: "Insights IA", href: "/insights" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Uma rota é "ativa" se for exatamente igual, ou se for uma sub-rota
// dela (ex: /transactions/42 também deve destacar "Transações").
// O Dashboard ("/") é tratado à parte pra não "vazar" e marcar tudo
// como ativo, já que toda rota começa com "/".
function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  const displayName = user?.name ?? "Usuário";
  const initials = getInitials(displayName);

  return (
    <>
      {/* Botão hambúrguer — só existe em telas menores que "lg" */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 shadow-lg lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Fundo escurecido atrás do menu aberto no mobile */}
      {isOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:z-auto lg:translate-x-0`}
      >
        <div className="flex items-center justify-between p-6">
          <h1 className="text-emerald-500 font-bold text-xl tracking-tight">
            FINANCE.AI
          </h1>

          {/* Botão de fechar — só aparece dentro do drawer mobile */}
          <button
            onClick={closeMenu}
            aria-label="Fechar menu"
            className="text-zinc-500 hover:text-zinc-300 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = isRouteActive(pathname, item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className={`relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500" />
                )}
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-emerald-500/20 ring-1 ring-white/10">
              {initials}
            </div>
            <span className="text-sm font-medium text-zinc-300 truncate">{displayName}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
