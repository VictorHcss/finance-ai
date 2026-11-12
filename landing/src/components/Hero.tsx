import { ArrowRight, Check, PlayCircle, Sparkles } from "lucide-react";
import { appLinks } from "@/lib/links";
import { ButtonLink } from "./ui";
import { DashboardMock } from "./DashboardMock";

const BADGES = ["Grátis para começar", "Sem cartão de crédito", "Importa CSV e OFX"];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10rem] top-40 h-[24rem] w-[24rem] rounded-full bg-ai-500/15 blur-[110px]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pt-24">
        <a
          href="#recursos"
          className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-xs text-zinc-300 backdrop-blur transition-colors hover:border-emerald-400/40 sm:text-sm"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-ai-500/20 px-2 py-0.5 font-semibold text-ai-200">
            <Sparkles size={12} /> Novo
          </span>
          Insights que explicam cada mudança
          <ArrowRight size={14} className="text-zinc-500" />
        </a>

        <h1
          className="mx-auto mt-7 max-w-4xl animate-fade-up text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-zinc-50 sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "80ms" }}
        >
          Seu dinheiro,
          <br />
          <span className="text-gradient">finalmente claro.</span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-zinc-400 sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          Transações, metas e insights em um só lugar. O Finance.AI lê o seu histórico real e mostra
          <span className="text-zinc-200"> o que mudou, quanto e por quê</span> — sem planilha e sem palpite.
        </p>

        <div
          className="mt-9 flex animate-fade-up flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          style={{ animationDelay: "240ms" }}
        >
          <ButtonLink href={appLinks.register} size="lg">
            Criar conta grátis
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </ButtonLink>
          <ButtonLink href={appLinks.demo} variant="secondary" size="lg">
            <PlayCircle size={18} className="text-emerald-400" />
            Ver a demonstração
          </ButtonLink>
        </div>

        <ul
          className="mt-7 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500"
          style={{ animationDelay: "320ms" }}
        >
          {BADGES.map((badge) => (
            <li key={badge} className="flex items-center gap-1.5">
              <Check size={15} className="text-emerald-400" />
              {badge}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto max-w-6xl animate-fade-up px-4 pb-20 sm:px-6 sm:pb-28" style={{ animationDelay: "420ms" }}>
        <DashboardMock />
      </div>
    </section>
  );
}
