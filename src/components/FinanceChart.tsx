"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LineChart, Plus } from "lucide-react";
import { storage } from "@/lib/storage";

type ChartPoint = {
  name: string;
  income: number;
  expense: number;
};

export function FinanceChart() {
  const [data, setData] = useState<(ChartPoint & { total: number })[]>([]);

  const loadData = useCallback(() => {
    storage
      .getChartData()
      .then((raw: ChartPoint[]) => {
        const withTotal = raw.map((point) => ({
          ...point,
          total: point.income - point.expense,
        }));
        setData(withTotal);
      })
      .catch((err) => console.error("Erro ao carregar dados do gráfico:", err));
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("transactions-changed", loadData);
    return () => window.removeEventListener("transactions-changed", loadData);
  }, [loadData]);

  // Os últimos 6 meses sempre vêm preenchidos (com zero) mesmo sem
  // nenhuma transação registrada — então "sem dados" não é um array
  // vazio, é todo ponto com entrada e saída zeradas. Sem esse
  // distinção, quem acabou de criar a conta via só uma linha reta em
  // zero, sem entender o que fazer a seguir.
  const hasData = data.some((point) => point.income !== 0 || point.expense !== 0);

  function openNewTransaction() {
    window.dispatchEvent(new Event("open-transaction-modal-new"));
  }

  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">Fluxo Mensal</h3>

      {!hasData && data.length > 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/60 text-zinc-500">
            <LineChart size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">
              Nenhuma transação nos últimos 6 meses
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Adicione sua primeira transação para ver o fluxo mensal aqui.
            </p>
          </div>
          <button
            onClick={openNewTransaction}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Plus size={14} />
            Adicionar transação
          </button>
        </div>
      ) : (
      <div className="h-[300px] min-w-0">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#27272a"
            />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 12, fontFamily: "var(--font-sans)" }}
            />

            <YAxis hide />

            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
              itemStyle={{ color: "#1baf80" }}
            />

            <Area
              type="monotone"
              dataKey="total"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
