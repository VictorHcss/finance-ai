"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { storage } from "@/lib/storage";
import type { Goal } from "@/lib/api";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Resumo de metas em andamento no Dashboard (seção 11 do pedido de
// evolução das metas) — só um resumo enxuto com link pra página
// completa, não uma segunda versão do Planejamento aqui dentro.
export function GoalsSummaryWidget() {
  const [goals, setGoals] = useState<Goal[] | null>(null);

  const load = useCallback(() => {
    storage
      .getGoalsStatus()
      .then(setGoals)
      .catch(() => setGoals([]));
  }, []);

  useEffect(() => {
    load();
    // "goals-changed" cobre depósitos/retiradas/edições feitas fora
    // desta tela; "transactions-changed" cobre receitas com valor
    // destinado a uma meta (a alocação muda o saldo da meta também).
    window.addEventListener("goals-changed", load);
    window.addEventListener("transactions-changed", load);
    return () => {
      window.removeEventListener("goals-changed", load);
      window.removeEventListener("transactions-changed", load);
    };
  }, [load]);

  if (goals === null) return null;

  const active = goals.filter((g) => !g.completed && g.percent < 100).slice(0, 3);
  if (active.length === 0) return null;

  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Target size={16} className="text-emerald-500" />
          Metas em andamento
        </h3>
        <Link
          href="/planning"
          className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
        >
          Ver todas
          <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {active.map((goal) => (
          <Link
            key={goal.id}
            href="/planning"
            className="block rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 p-3 transition-colors"
          >
            <p className="text-sm font-medium text-zinc-200 truncate">{goal.goal_name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
            </p>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(goal.percent, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-400 font-bold mt-1">{Math.min(goal.percent, 100).toFixed(0)}%</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
