"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpCircle, ArrowDownCircle, Receipt, Trash2, Pencil } from "lucide-react";
import { api, Transaction } from "@/lib/api";

export function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();

    // Escuta o evento disparado ao criar OU excluir uma transação,
    // em qualquer parte do app, para manter esta lista sincronizada.
    window.addEventListener("transactions-changed", loadTransactions);
    return () => window.removeEventListener("transactions-changed", loadTransactions);
  }, [loadTransactions]);

  async function handleDelete(id: number | undefined, description: string) {
    if (!id) return;

    const confirmed = window.confirm(
      `Excluir a transação "${description}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      window.dispatchEvent(new Event("transactions-changed"));
    } catch (err) {
      console.error("Erro ao excluir transação:", err);
      alert("Não foi possível excluir a transação. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Receipt className="text-emerald-500" size={20} />
        <h2 className="text-lg font-bold">Transações Recentes</h2>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center border-b border-zinc-800/50 pb-3 last:border-0 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-24"></div>
                  <div className="h-3 bg-zinc-800 rounded w-16"></div>
                </div>
              </div>
              <div className="h-4 bg-zinc-800 rounded w-20"></div>
            </div>
          ))
        ) : transactions.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">Nenhuma atividade recente.</p>
        ) : (
          transactions.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="group flex justify-between items-center border-b border-zinc-800/50 pb-3 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                {t.type === "income" ? (
                  <ArrowUpCircle className="text-emerald-500 shrink-0" size={20} />
                ) : (
                  <ArrowDownCircle className="text-rose-500 shrink-0" size={20} />
                )}

                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.description}</p>
                  <p className="text-xs text-zinc-500">{t.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <p
                  className={`text-sm font-bold ${
                    t.type === "income" ? "text-emerald-500" : "text-zinc-100"
                  }`}
                >
                  {t.type === "expense" ? "- " : "+ "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(t.amount)}
                </p>

                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-transaction-modal", { detail: t }))}
                  aria-label={`Editar transação ${t.description}`}
                  className="text-zinc-600 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(t.id, t.description)}
                  disabled={deletingId === t.id}
                  aria-label={`Excluir transação ${t.description}`}
                  className="text-zinc-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
