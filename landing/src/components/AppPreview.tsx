import { Apple, Check, Play, Target, Utensils, Briefcase, Car } from "lucide-react";
import { appLinks } from "@/lib/links";
import { ButtonLink, SectionHeading, brl } from "./ui";

const POINTS = [
  "Mesma conta e mesmos dados da versão web",
  "Interface pensada para usar com uma mão",
  "Notificações de metas e gastos direto no celular",
];

const TRANSACTIONS = [
  { icon: Briefcase, name: "Freelance — Projeto Web", category: "Renda extra", value: 1200, income: true },
  { icon: Car, name: "Combustível", category: "Transporte", value: 280, income: false },
  { icon: Utensils, name: "Restaurante", category: "Alimentação", value: 145, income: false },
];

function Phone() {
  return (
    <div className="relative mx-auto w-[17.5rem] sm:w-[19rem]">
      <div aria-hidden className="absolute -inset-10 rounded-full bg-emerald-500/20 blur-[90px]" />
      <div
        role="img"
        aria-label="Prévia do Finance.AI no celular"
        className="relative rounded-[2.75rem] border border-white/15 bg-zinc-950 p-2.5 shadow-2xl shadow-black/70 ring-1 ring-black"
      >
        <div className="overflow-hidden rounded-[2.25rem] bg-gradient-to-b from-zinc-900 to-zinc-950">
          {/* status bar */}
          <div className="relative flex items-center justify-between px-6 pb-2 pt-3 text-[10px] font-semibold text-zinc-300">
            <span className="font-figures">9:41</span>
            <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
            <span className="flex gap-1">
              <span className="h-2 w-3 rounded-sm bg-zinc-400" />
              <span className="h-2 w-4 rounded-sm bg-zinc-300" />
            </span>
          </div>

          <div className="px-4 pb-6">
            <p className="text-[11px] text-zinc-500">Olá, Ana 👋</p>
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-zinc-950 shadow-lg shadow-emerald-500/20">
              <p className="text-[11px] font-medium opacity-80">Saldo de agosto</p>
              <p className="font-figures mt-1 text-2xl font-bold">{brl(4507.5)}</p>
              <div className="mt-3 flex gap-4 text-[10px] font-medium">
                <span>↑ {brl(7700)}</span>
                <span className="opacity-75">↓ {brl(3192.5)}</span>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <Target size={12} className="text-emerald-300" /> Viagem para o Nordeste
                </span>
                <span className="font-figures text-emerald-300">31%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/5">
                <div className="h-full w-[31%] rounded-full bg-emerald-400" />
              </div>
            </div>

            <p className="mt-4 text-[11px] font-semibold text-zinc-400">Últimas transações</p>
            <ul className="mt-2 space-y-1.5">
              {TRANSACTIONS.map(({ icon: Icon, name, category, value, income }) => (
                <li key={name} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-2.5 py-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${income ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                    <Icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-zinc-200">{name}</span>
                    <span className="block text-[10px] text-zinc-500">{category}</span>
                  </span>
                  <span className={`font-figures text-[11px] font-semibold ${income ? "text-emerald-300" : "text-zinc-300"}`}>
                    {income ? "+" : "−"}
                    {brl(value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppPreview() {
  return (
    <section id="app" className="relative scroll-mt-20 overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2">
        <div className="reveal">
          <SectionHeading
            align="left"
            eyebrow="Em breve · Android e iOS"
            title={
              <>
                O Finance.AI <span className="text-gradient">no seu bolso.</span>
              </>
            }
            description="Estamos transformando o Finance.AI em aplicativo. Enquanto ele não chega às lojas, a versão web já foi feita para o celular — dá para usar hoje, direto no navegador."
          />
          <ul className="mt-8 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <Check size={12} strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href={appLinks.register}>Usar no navegador agora</ButtonLink>
            <div className="flex gap-2">
              {[
                { icon: Play, store: "Google Play" },
                { icon: Apple, store: "App Store" },
              ].map(({ icon: Icon, store }) => (
                <span
                  key={store}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 text-xs text-zinc-500"
                  title={`${store} — em breve`}
                >
                  <Icon size={15} />
                  <span>
                    <span className="block text-[9px] uppercase tracking-wider">Em breve</span>
                    <span className="-mt-0.5 block font-semibold text-zinc-400">{store}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="reveal">
          <Phone />
        </div>
      </div>
    </section>
  );
}
