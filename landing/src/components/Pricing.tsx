import { ArrowRight, Check } from "lucide-react";
import { appLinks } from "@/lib/links";
import { ButtonLink, SectionHeading } from "./ui";

const INCLUDED = [
  "Dashboard com tendência mês a mês",
  "Transações ilimitadas, com categorias",
  "Metas com depósitos e histórico",
  "Insights com explicação dos números",
  "Detecção de despesas recorrentes",
  "Importação CSV/OFX e exportação CSV",
  "Central de notificações",
  "Dados isolados por conta",
];

export function Pricing() {
  return (
    <section id="precos" className="relative scroll-mt-20 border-y border-white/5 bg-zinc-900/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Preços"
          title="Comece sem pagar nada"
          description="Hoje todos os recursos estão liberados no plano gratuito — sem limite de transações e sem pedir cartão de crédito."
        />

        <div className="reveal mx-auto mt-14 max-w-3xl">
          <div className="ring-gradient relative overflow-hidden rounded-3xl bg-zinc-900/80 p-7 shadow-2xl shadow-black/40 sm:p-10">
            <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="relative grid gap-10 md:grid-cols-[1fr_1.3fr]">
              <div>
                <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Plano Gratuito
                </span>
                <p className="mt-5 flex items-end gap-1">
                  <span className="font-figures text-5xl font-bold tracking-tight text-zinc-50">R$ 0</span>
                  <span className="mb-1.5 text-sm text-zinc-500">/mês</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Para organizar as finanças pessoais do jeito certo, desde o primeiro dia.
                </p>
                <ButtonLink href={appLinks.register} size="lg" className="mt-7 w-full">
                  Criar conta grátis
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </ButtonLink>
                <a
                  href={appLinks.demo}
                  className="mt-3 block text-center text-xs text-zinc-500 underline-offset-4 hover:text-emerald-300 hover:underline"
                >
                  ou explore a conta de demonstração
                </a>
              </div>

              <ul className="grid content-start gap-3 sm:grid-cols-2 md:grid-cols-1">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
