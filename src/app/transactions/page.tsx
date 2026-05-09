"use client";

import { useEffect, useState } from "react";
import { ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react";

interface Transaction {
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar dados do Python
  async function fetchTransactions() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/transactions");
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Extrato</h1>
          <p className="text-zinc-400">Gerencie seu histórico financeiro</p>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-500 text-xs uppercase font-bold">
              <th className="p-4">Descrição</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Categoria</th>
              <th className="p-4 text-right">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500">
                  Carregando...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              transactions.map((t, index) => (
                <tr
                  key={index}
                  className="hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-4 flex items-center gap-3">
                    {t.type === "income" ? (
                      <ArrowUpCircle className="text-emerald-500" size={18} />
                    ) : (
                      <ArrowDownCircle className="text-rose-500" size={18} />
                    )}
                    <span className="font-medium">{t.description}</span>
                  </td>
                  <td
                    className={`p-4 font-bold ${t.type === "income" ? "text-emerald-500" : "text-zinc-100"}`}
                  >
                    {t.type === "expense" ? "- " : "+ "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(t.amount)}
                  </td>
                  <td className="p-4 text-zinc-400 text-sm">
                    <span className="bg-zinc-800 px-2 py-1 rounded-md">
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4 text-right text-zinc-500 text-sm">
                    {new Date(t.date).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
