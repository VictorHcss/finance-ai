import type { ReactNode } from "react";
import {
  Bell,
  BrainCircuit,
  FileSpreadsheet,
  Lock,
  Repeat,
  ShieldCheck,
  Target,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { SectionHeading, brl } from "./ui";

function Card({
  icon: Icon,
  title,
  text,
  accent = "emerald",
  className = "",
  children,
}: {
  icon: typeof Wallet;
  title: string;
  text: string;
  accent?: "emerald" | "ai";
  className?: string;
  children?: ReactNode;
}) {
  const accentStyles =
    accent === "ai"
      ? "bg-ai-500/15 text-ai-300 ring-ai-400/25"
      : "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20";
  return (
    <article
      className={`reveal group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-900/30 p-6 transition-colors hover:border-white/15 sm:p-7 ${className}`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ring-inset ${accentStyles}`}>
        <Icon size={19} />
      </span>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-zinc-50">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
      {children && <div className="mt-6 flex-1">{children}</div>}
    </article>
  );
}

function InsightVisual() {
  const rows = [
    { label: "Julho", value: 540, width: "70%", style: "bg-white/15" },
    { label: "Agosto", value: 765.5, width: "100%", style: "bg-gradient-to-r from-ai-500 to-ai-300" },
  ];
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">Alimentação</p>
        <span className="font-figures rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300">
          +41,8%
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-xs">
            <span className="text-zinc-500">{row.label}</span>
            <div className="h-2.5 rounded-full bg-white/5">
              <div className={`h-full rounded-full ${row.style}`} style={{ width: row.width }} />
            </div>
            <span className="font-figures text-zinc-300">{brl(row.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4 text-xs">
        <span className="text-zinc-500">Responsáveis:</span>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-300">
          Restaurante <span className="font-figures text-rose-300">+R$ 145,00</span>
        </span>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-300">
          Supermercado <span className="font-figures text-rose-300">+R$ 80,50</span>
        </span>
      </div>
    </div>
  );
}

function GoalRing() {
  const pct = 43;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth="9" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="url(#goalGradient)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
          />
          <defs>
            <linearGradient id="goalGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6BE0B3" />
              <stop offset="100%" stopColor="#1BAF80" />
            </linearGradient>
          </defs>
        </svg>
        <span className="font-figures absolute inset-0 grid place-items-center text-xl font-bold text-zinc-50">{pct}%</span>
      </div>
      <div className="text-xs">
        <p className="font-semibold text-zinc-200">Reserva de Emergência</p>
        <p className="font-figures mt-1 text-zinc-500">R$ 6.400 / R$ 15.000</p>
        <p className="mt-2 text-zinc-400">
          Faltam <span className="font-figures text-emerald-300">R$ 8.600</span>
        </p>
      </div>
    </div>
  );
}

function RecurringList() {
  const items = [
    { name: "Aluguel", value: 1800, day: "dia 2" },
    { name: "Internet", value: 119.9, day: "dia 18" },
    { name: "Streaming", value: 39.9, day: "dia 5" },
  ];
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-950/60 px-3 py-2.5 text-xs">
          <span className="flex items-center gap-2 text-zinc-300">
            <Repeat size={13} className="text-emerald-400" />
            {item.name}
            <span className="text-zinc-600">· {item.day}</span>
          </span>
          <span className="font-figures text-zinc-200">{brl(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function ImportVisual() {
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <div className="space-y-2">
        {["extrato-agosto.ofx", "cartao-julho.csv"].map((file) => (
          <div key={file} className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-zinc-950/40 px-3 py-2.5 text-xs text-zinc-300">
            <FileSpreadsheet size={15} className="text-emerald-400" />
            {file}
          </div>
        ))}
      </div>
      <div aria-hidden className="hidden h-px w-10 bg-gradient-to-r from-white/10 to-emerald-400/60 sm:block" />
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-emerald-300">
          <CheckCircle2 size={14} /> Pronto para revisar
        </p>
        <p className="mt-1.5 text-zinc-400">
          <span className="font-figures text-zinc-200">48</span> transações categorizadas
        </p>
        <p className="text-zinc-400">
          <span className="font-figures text-zinc-200">3</span> duplicadas ignoradas
        </p>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="recursos" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Recursos"
          title={
            <>
              Tudo para entender seu dinheiro,
              <span className="text-zinc-500"> nada para atrapalhar.</span>
            </>
          }
          description="Do lançamento do dia a dia até a meta do ano que vem — com explicações no lugar de gráficos que ninguém lê."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <Card
            icon={BrainCircuit}
            accent="ai"
            title="Insights que explicam o porquê"
            text="Detecta mudanças de comportamento mês a mês e mostra a conta: valor atual, anterior, a diferença e quem mais contribuiu."
            className="md:col-span-2"
          >
            <InsightVisual />
          </Card>

          <Card
            icon={Target}
            title="Metas com progresso real"
            text="Deposite, acompanhe o percentual e veja quanto falta para chegar lá."
          >
            <GoalRing />
          </Card>

          <Card
            icon={Repeat}
            title="Recorrências automáticas"
            text="Aluguel, assinaturas e contas fixas identificados sozinhos a partir do histórico."
          >
            <RecurringList />
          </Card>

          <Card
            icon={FileSpreadsheet}
            title="Importe o extrato do banco"
            text="Envie CSV ou OFX, revise antes de confirmar e deixe a deduplicação cuidar dos lançamentos repetidos."
            className="md:col-span-2"
          >
            <ImportVisual />
          </Card>

          <Card
            icon={Wallet}
            title="Transações organizadas"
            text="Crie, edite, categorize, pesquise e exporte em CSV respeitando o filtro aplicado."
          />
          <Card
            icon={Bell}
            title="Notificações que importam"
            text="Alertas de metas e gastos em uma central com filtros e marcação de lidas."
          />
          <Card
            icon={ShieldCheck}
            title="Privacidade de verdade"
            text="Cada conta acessa só os próprios dados — isso é testado automaticamente. Senhas com hash PBKDF2."
          >
            <p className="flex items-center gap-2 text-xs text-zinc-500">
              <Lock size={13} className="text-emerald-400" /> Sessões com expiração automática.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
