"use client";
import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { storage } from "@/lib/storage";
import type { GoalContribution } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface GoalContributionsHistoryProps {
  goalId: number;
  onChange: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

// Histórico do cofrinho (seção 5 do pedido de evolução das metas): cada
// depósito/retirada, de onde veio (transação vinculada ou manual), com
// opção de apagar um lançamento indevido. Carregado sob demanda — só
// quando a pessoa abre o histórico, pra não pedir isso pra cada card de
// meta na tela toda vez.
export function GoalContributionsHistory({ goalId, onChange }: GoalContributionsHistoryProps) {
  const [contributions, setContributions] = useState<GoalContribution[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    storage
      .getGoalContributions(goalId)
      .then((data) => {
        if (!cancelled) setContributions(data);
      })
      .catch(() => {
        if (!cancelled) setContributions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  async function handleDelete(contributionId: number) {
    if (!confirm("Remover este lançamento do histórico? O saldo da meta será recalculado.")) return;
    setDeletingId(contributionId);
    try {
      await storage.deleteGoalContribution(goalId, contributionId);
      setContributions((prev) => (prev ? prev.filter((c) => c.id !== contributionId) : prev));
      onChange();
      window.dispatchEvent(new Event("goals-changed"));
    } catch (err) {
      console.error("Erro ao remover contribuição:", err);
      addToast("error", "Não foi possível remover esse lançamento agora. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p className="text-xs text-zinc-500 py-3">Carregando histórico...</p>;
  }

  if (!contributions || contributions.length === 0) {
    return <p className="text-xs text-zinc-500 py-3">Nenhuma movimentação registrada ainda.</p>;
  }

  return (
    <ul className="space-y-1.5 py-2">
      {contributions.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-800/50 group/item"
        >
          <div className="flex items-center gap-2 min-w-0">
            {c.type === "withdrawal" ? (
              <ArrowDownCircle size={16} className="text-rose-400 shrink-0" />
            ) : (
              <ArrowUpCircle size={16} className="text-emerald-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-zinc-300 truncate">{c.source}</p>
              <p className="text-[11px] text-zinc-500">{formatDate(c.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`font-figures text-xs font-bold ${
                c.type === "withdrawal" ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {c.type === "withdrawal" ? "-" : "+"} {formatCurrency(c.amount)}
            </span>
            <button
              onClick={() => handleDelete(c.id)}
              disabled={deletingId === c.id}
              aria-label="Remover lançamento"
              title="Remover lançamento"
              className="text-zinc-600 hover:text-rose-400 transition-opacity disabled:opacity-50 opacity-100 md:opacity-0 md:group-hover/item:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
