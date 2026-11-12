"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { appLinks, sectionLinks } from "@/lib/links";

// Único componente com JavaScript na landing: o menu precisa fechar
// sozinho ao tocar num link e com Esc.
export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        className="grid h-10 w-10 place-items-center rounded-xl text-zinc-300 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/5"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-16 border-b border-white/5 bg-zinc-950 px-4 pb-6 pt-2 shadow-2xl shadow-black/60 animate-fade-up sm:px-6"
        >
          <nav aria-label="Seções" className="flex flex-col">
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base text-zinc-300 hover:bg-white/5 hover:text-zinc-50"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
            <a
              href={appLinks.login}
              className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-zinc-100 ring-1 ring-inset ring-white/10"
            >
              Entrar
            </a>
            <a
              href={appLinks.register}
              className="flex h-11 items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950"
            >
              Criar conta
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
