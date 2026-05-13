"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpCircle, ArrowDownCircle, Receipt } from "lucide-react";
import { api, Transaction } from "@/lib/api";

export function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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
    
    // Escuta evento customizado para atualizar lista quando nova transação for adicionada
    window.addEventListener("transaction-added", loadTransactions);
    return () => window.removeEventListener("transaction-added", loadTransactions);
  }, [loadTransactions]);

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
          transactions.slice(0, 5).map((t, i) => (
            <div
              key={i}
              className="flex justify-between items-center border-b border-zinc-800/50 pb-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                {t.type === "income" ? (
                  <ArrowUpCircle className="text-emerald-500" size={20} />
                ) : (
                  <ArrowDownCircle className="text-rose-500" size={20} />
                )}

                <div>
                  <p className="text-sm font-medium text-white">{t.description}</p>
                  <p className="text-xs text-zinc-500">{t.category}</p>
                </div>
              </div>

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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
