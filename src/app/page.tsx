import { FinanceChart } from "@/components/FinanceChart";
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { TransactionList } from "@/components/TransactionList";

export default function Home() {
  return (
    <main className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-zinc-400 text-sm">
          Acompanhe sua saúde financeira e insights de IA.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Saldo Total"
          amount="R$ 4.250,00"
          icon={<DollarSign size={20} />}
        />
        <SummaryCard
          title="Entradas"
          amount="R$ 1.200,00"
          icon={<ArrowUpRight size={20} />}
          trend="positive"
        />
        <SummaryCard
          title="Saídas"
          amount="R$ 460,00"
          icon={<ArrowDownRight size={20} />}
          trend="negative"
        />
      </section>

      <section>
        <FinanceChart />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionList />
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 flex flex-col justify-center">
          <h3 className="text-emerald-500 font-bold mb-2 flex items-center gap-2">
            Insight da IA
          </h3>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Seus gastos com <strong>Lazer</strong> diminuíram 15% esta semana.
            Isso te ajudará a atingir sua meta de reserva para a viagem de maio
            mais rápido!
          </p>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ title, amount, icon, trend }: any) {
  return (
    <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
      <div className="flex justify-between items-center text-zinc-400">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <h2 className="text-3xl font-bold tracking-tight">{amount}</h2>
      {trend && (
        <p
          className={`text-xs ${trend === "positive" ? "text-emerald-500" : "text-rose-500"}`}
        >
          {trend === "positive" ? "+12%" : "-4%"} em relação ao mês passado
        </p>
      )}
    </div>
  );
}
