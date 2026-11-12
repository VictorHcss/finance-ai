import { ArrowDownRight, ArrowUpRight, Bell, BrainCircuit, Repeat, Target, Wallet } from "lucide-react";
import { brl } from "./ui";

// Prévia ilustrativa do dashboard. Os números batem com a conta de
// demonstração do backend (agosto vs. julho), para quem clicar em
// "Ver a demonstração" reconhecer o que viu aqui.
const CHART = [
  { month: "Mar", income: 6200, expense: 3900 },
  { month: "Abr", income: 6200, expense: 3420 },
  { month: "Mai", income: 6850, expense: 4100 },
  { month: "Jun", income: 6200, expense: 3610 },
  { month: "Jul", income: 6200, expense: 2460 },
  { month: "Ago", income: 7700, expense: 3192.5 },
];
const CHART_MAX = 8000;

const CATEGORIES = [
  { name: "Moradia", value: 1919.8, color: "bg-emerald-400" },
  { name: "Alimentação", value: 765.5, color: "bg-ai-400" },
  { name: "Transporte", value: 280, color: "bg-sky-400" },
  { name: "Saúde", value: 187.2, color: "bg-amber-300" },
];
const TOTAL_EXPENSE = 3192.5;

function Stat({
  label,
  value,
  delta,
  positive,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  delta: string;
  positive: boolean;
  icon: typeof Wallet;
  accent: string;
}) {
  const Trend = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${accent}`}>
          <Icon size={14} />
        </span>
      </div>
      <p className="font-figures mt-2 text-lg font-semibold text-zinc-50 sm:text-xl">{brl(value)}</p>
      <p className={`mt-1 flex items-center gap-1 text-[11px] ${positive ? "text-emerald-400" : "text-rose-400"}`}>
        <Trend size={12} />
        {delta}
      </p>
    </div>
  );
}

export function DashboardMock() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute inset-x-10 -top-6 bottom-10 rounded-[2rem] bg-gradient-to-b from-emerald-500/25 via-emerald-500/5 to-transparent blur-3xl"
      />

      <div
        role="img"
        aria-label="Prévia do dashboard do Finance.AI com saldo, gráfico de entradas e saídas, gastos por categoria e um insight"
        className="ring-gradient relative overflow-hidden rounded-2xl bg-zinc-900/85 shadow-2xl shadow-black/60 backdrop-blur-xl sm:rounded-3xl"
      >
        {/* Barra da janela */}
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="mx-auto hidden w-full max-w-xs items-center justify-center rounded-md bg-zinc-950/70 px-3 py-1 text-[11px] text-zinc-500 sm:flex">
            app.financeai.com.br/dashboard
          </div>
          <div className="w-10" />
        </div>

        <div className="grid gap-3 p-3 text-left sm:gap-4 sm:p-6 lg:grid-cols-3">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3 sm:gap-4 lg:col-span-3">
            <Stat label="Saldo do mês" value={4507.5} delta="+20,5% vs. julho" positive icon={Wallet} accent="bg-emerald-500/15 text-emerald-300" />
            <Stat label="Entradas" value={7700} delta="+24,2% vs. julho" positive icon={ArrowUpRight} accent="bg-emerald-500/15 text-emerald-300" />
            <Stat label="Saídas" value={TOTAL_EXPENSE} delta="+29,8% vs. julho" positive={false} icon={ArrowDownRight} accent="bg-rose-500/15 text-rose-300" />
          </div>

          {/* Gráfico */}
          <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-200">Entradas × Saídas</p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-emerald-400" /> Entradas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-rose-400/80" /> Saídas
                </span>
              </div>
            </div>
            <div className="relative mt-5 h-40 sm:h-48">
              <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3].map((line) => (
                  <div key={line} className="border-t border-dashed border-white/[0.06]" />
                ))}
              </div>
              <div className="relative flex h-full items-end justify-between gap-2 sm:gap-4">
                {CHART.map((point, i) => {
                  const current = i === CHART.length - 1;
                  return (
                    <div key={point.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div className="flex h-full w-full items-end justify-center gap-1">
                        <div
                          className={`w-full max-w-[18px] rounded-t-[5px] bg-gradient-to-t ${current ? "from-emerald-500 to-emerald-300" : "from-emerald-600/60 to-emerald-400/60"}`}
                          style={{ height: `${(point.income / CHART_MAX) * 100}%` }}
                        />
                        <div
                          className={`w-full max-w-[18px] rounded-t-[5px] ${current ? "bg-rose-400" : "bg-rose-400/45"}`}
                          style={{ height: `${(point.expense / CHART_MAX) * 100}%` }}
                        />
                      </div>
                      <span className={`text-[11px] ${current ? "font-semibold text-zinc-200" : "text-zinc-500"}`}>
                        {point.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="grid gap-3 sm:gap-4">
            <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4">
              <p className="text-sm font-semibold text-zinc-200">Gastos por categoria</p>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5">
                {CATEGORIES.map((cat) => (
                  <div key={cat.name} className={cat.color} style={{ width: `${(cat.value / TOTAL_EXPENSE) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-3 space-y-2">
                {CATEGORIES.map((cat) => (
                  <li key={cat.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                      {cat.name}
                    </span>
                    <span className="font-figures text-zinc-300">{brl(cat.value)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-ai-500/25 bg-gradient-to-br from-ai-500/15 to-transparent p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ai-300">
                <BrainCircuit size={13} /> Insight
              </p>
              <p className="mt-2 text-sm font-semibold leading-snug text-zinc-100">
                Alimentação subiu <span className="font-figures text-ai-200">42%</span> em relação a julho
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                Principais responsáveis: Restaurante (<span className="font-figures">R$ 145,00</span>) e
                Supermercado (<span className="font-figures">+R$ 80,50</span>).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cartões flutuantes (só em telas grandes) */}
      <div className="absolute -bottom-16 left-10 hidden w-60 animate-float rounded-2xl border border-white/10 bg-zinc-900/90 p-4 text-left shadow-2xl shadow-black/50 backdrop-blur-xl xl:block">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
            <Target size={16} />
          </span>
          <div>
            <p className="text-xs font-semibold text-zinc-100">Reserva de Emergência</p>
            <p className="font-figures text-[11px] text-zinc-500">R$ 6.400 de R$ 15.000</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-[43%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          <span className="font-figures text-emerald-300">43%</span> · prazo: jan/2027
        </p>
      </div>

      <div
        className="absolute -top-9 right-10 hidden w-64 animate-float rounded-2xl border border-white/10 bg-zinc-900/90 p-4 text-left shadow-2xl shadow-black/50 backdrop-blur-xl xl:block"
        style={{ animationDelay: "-3s" }}
      >
        <div className="flex items-start gap-3">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-200">
            <Bell size={15} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-zinc-900" />
          </span>
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-zinc-100">
              <Repeat size={12} className="text-zinc-400" /> Despesa recorrente detectada
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Internet · <span className="font-figures">R$ 119,90</span> todo mês, dia 18
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
