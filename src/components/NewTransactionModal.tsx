"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export function NewTransactionModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("income");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const newTransaction = {
      description,
      amount: parseFloat(amount),
      type: type as "income" | "expense",
      category,
      date: new Date().toISOString(),
    };

    try {
      await api.createTransaction(newTransaction);
      
      setIsOpen(false);
      setDescription("");
      setAmount("");
      setCategory("");
      setType("income");

      // Recarrega os dados sem reload total da página se possível
      router.refresh();
      window.dispatchEvent(new Event("transaction-added"));
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 flex items-center gap-2 px-4 py-4 md:px-6 md:py-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold shadow-[0_10px_20px_rgba(16,185,129,0.2)] ring-1 ring-white/20 hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] hover:-translate-y-1 active:scale-95 transition-all duration-300 ease-out group z-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        aria-label="Nova Transação"
        title="Nova Transação"
      >
        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />

        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap tracking-tight">
          Nova Transação
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Adicionar Transação</h2>

          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
              Descrição
            </label>

            <input
              type="text"
              placeholder="Ex: Venda de produto"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                Valor
              </label>

              <input
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                Tipo
              </label>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
              >
                <option value="income">Entrada</option>
                <option value="expense">Saída</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
              Categoria
            </label>

            <input
              type="text"
              placeholder="Ex: Lazer, Freelance..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold text-sm transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar Transação"}
          </button>
        </form>
      </div>
    </div>
  );
}
