"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";

import { TransactionList } from "@/components/TransactionList";
import { api, InsightData } from "@/lib/api";

const FinanceChart = dynamic(
  () => import("@/components/FinanceChart").then((mod) => mod.FinanceChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full bg-zinc-900/50 rounded-xl animate-pulse flex items-center justify-center text-zinc-500">
        Carregando gráfico...
      </div>
    ),
  },
);

interface DashboardSummary {
  incomes: number;
  expenses: number;
  total: number;
}

interface SummaryCardProps {
  title: string;
  amount: string;
  icon: React.ReactNode;
  percentage?: number;
  type?: "income" | "expense";
  getTrendAnalysis?: (
    value: number | undefined,
    type: "income" | "expense",
  ) => string;
}

export default function Home() {
  const [summary, setSummary] = useState<DashboardSummary>({
    incomes: 0,
    expenses: 0,
    total: 0,
  });

  const [insight, setInsight] = useState<InsightData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, insightData] = await Promise.all([
        api.getSummary(),
        api.getInsights(),
      ]);

      setSummary(summaryData);
      setInsight(insightData);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getTrendAnalysis = (
    value: number | undefined,
    type: "income" | "expense",
  ) => {
    if (value === undefined || value === null) {
      return "Sem dados suficientes ainda.";
    }

    const absValue = Math.abs(value);

    if (type === "income") {
      if (value > 0) {
        return `Faturamento subiu ${absValue}% este mês! 🚀`;
      }

      if (value < 0) {
        return `Entradas caíram ${absValue}%. Hora de prospectar?`;
      }

      return "Suas entradas estão estáveis.";
    }

    if (type === "expense") {
      if (value > 0) {
        return `Gastos aumentaram ${absValue}%. Atenção ao teto!`;
      }

      if (value < 0) {
        return `Economia de ${absValue}%! Ótima gestão. 👏`;
      }

      return "Seus gastos se mantiveram constantes.";
    }

    return "Sem dados suficientes.";
  };

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
          amount={formatCurrency(summary.total)}
          icon={<DollarSign size={20} />}
        />

        <SummaryCard
          title="Entradas"
          amount={formatCurrency(summary.incomes)}
          icon={<ArrowUpRight size={20} />}
          percentage={insight?.variacao_percentual}
          type="income"
          getTrendAnalysis={getTrendAnalysis}
        />

        <SummaryCard
          title="Saídas"
          amount={formatCurrency(summary.expenses)}
          icon={<ArrowDownRight size={20} />}
          percentage={insight?.variacao_percentual}
          type="expense"
          getTrendAnalysis={getTrendAnalysis}
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

          {insight ? (
            <div className="space-y-3">
              <p className="text-zinc-300 text-sm leading-relaxed">
                {insight.alerta}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">
                    Previsão
                  </p>

                  <p className="text-emerald-500 font-bold">
                    {formatCurrency(insight.previsao_proximo_mes)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">
                    Economia
                  </p>

                  <p className="text-emerald-500 font-bold">
                    {formatCurrency(insight.economias_sugeridas)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Ainda não há dados suficientes.
              </p>

              <p className="text-zinc-500 text-xs">
                Adicione transações para gerar insights automáticos.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  amount,
  icon,
  percentage,
  type,
  getTrendAnalysis,
}: SummaryCardProps) {
  const hasData = percentage !== undefined && percentage !== null;

  const analysis =
    hasData && type && getTrendAnalysis
      ? getTrendAnalysis(percentage, type)
      : "Nenhuma movimentação registrada ainda.";

  const getTrendColor = () => {
    if (!hasData) {
      return "text-zinc-500";
    }

    if (percentage === 0) {
      return "text-zinc-400";
    }

    if (type === "income") {
      return percentage > 0 ? "text-emerald-500" : "text-rose-500";
    }

    if (type === "expense") {
      return percentage > 0 ? "text-rose-500" : "text-emerald-500";
    }

    return "text-zinc-500";
  };

  return (
    <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3 hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-center text-zinc-400">
        <span className="text-sm font-medium">{title}</span>

        <div className="p-1.5 bg-zinc-800 rounded-md">{icon}</div>
      </div>

      <h2 className="text-3xl font-bold tracking-tight">{amount}</h2>

      <div className={`text-xs font-medium leading-relaxed ${getTrendColor()}`}>
        {analysis}
      </div>
    </div>
  );
}
