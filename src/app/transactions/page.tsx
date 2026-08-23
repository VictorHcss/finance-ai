"use client";

import { useEffect, useState } from "react";
import { ArrowUpCircle, ArrowDownCircle, Search, Trash2, Pencil } from "lucide-react";
import { api, Transaction } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function fetchTransactions() {
    try {
      const data = await api.getTransactions();
      setTransactions(data);
      setFilteredTransactions(data);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();

    // O botão flutuante "+" (NewTransactionModal) existe em todas as
    // páginas e dispara esse evento ao criar uma transação. Sem este
    // listener, quem estivesse na tela de Extrato só via a nova
    // transação depois de recarregar a página manualmente.
    window.addEventListener("transactions-changed", fetchTransactions);
    return () => window.removeEventListener("transactions-changed", fetchTransactions);
  }, []);

  useEffect(() => {
    const filtered = transactions.filter((t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredTransactions(filtered);
  }, [search, transactions]);

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
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold">Extrato</h1>
          <p className="text-zinc-400">Gerencie seu histórico financeiro</p>
        </div>

        <div className="relative group w-full sm:w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar transações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all w-full"
          />
        </div>
      </div>

      {/* Tabela de Transações — com scroll horizontal próprio em telas
          estreitas, em vez de forçar scroll na página inteira */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-500 text-xs uppercase font-bold">
              <th className="p-4">Descrição</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Categoria</th>
              <th className="p-4 text-right">Data</th>
              <th className="p-4 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  Carregando...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  {transactions.length === 0
                    ? "Nenhuma transação ainda. Toque no botão + para adicionar a primeira."
                    : "Nenhuma transação encontrada para essa busca."}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => (
                <tr
                  key={t.id}
                  className="group hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-4 flex items-center gap-3">
                    {t.type === "income" ? (
                      <ArrowUpCircle className="text-emerald-500 shrink-0" size={18} />
                    ) : (
                      <ArrowDownCircle className="text-rose-500 shrink-0" size={18} />
                    )}
                    <span className="font-medium">{t.description}</span>
                  </td>
                  <td
                    className={`p-4 font-bold whitespace-nowrap ${t.type === "income" ? "text-emerald-500" : "text-zinc-100"}`}
                  >
                    {t.type === "expense" ? "- " : "+ "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(t.amount)}
                  </td>
                  <td className="p-4 text-zinc-400 text-sm">
                    <span className="bg-zinc-800 px-2 py-1 rounded-md whitespace-nowrap">
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4 text-right text-zinc-500 text-sm whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
