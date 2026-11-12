import { LineChart, ListChecks, UserPlus } from "lucide-react";
import { SectionHeading } from "./ui";

const STEPS = [
  {
    icon: UserPlus,
    title: "Crie sua conta",
    text: "Leva menos de um minuto. Só nome, e-mail e senha — sem cartão.",
  },
  {
    icon: ListChecks,
    title: "Traga suas transações",
    text: "Lance na mão ou importe o extrato do banco em CSV ou OFX.",
  },
  {
    icon: LineChart,
    title: "Entenda e ajuste",
    text: "Veja para onde o dinheiro foi, o que mudou e quanto falta para cada meta.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-20 border-y border-white/5 bg-zinc-900/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Como funciona"
          title="Do zero ao controle em três passos"
          description="Nada de configurar categoria por categoria antes de começar."
        />

        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          <div
            aria-hidden
            className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 md:block"
          />
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="reveal relative flex flex-col items-center text-center">
              <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/25 bg-zinc-950 text-emerald-300 shadow-lg shadow-emerald-500/10">
                <Icon size={22} />
                <span className="font-figures absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-zinc-950">
                  {index + 1}
                </span>
              </span>
              <h3 className="mt-6 text-lg font-bold tracking-tight text-zinc-50">{title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
