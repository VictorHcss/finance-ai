"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

export function NewTransactionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("income");
  const [category, setCategory] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const newTransaction = {
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: new Date().toISOString(),
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTransaction),
      });

      if (response.ok) {
        alert("Transação salva com sucesso! 🚀");

        // fechar modal
        setIsOpen(false);

        // limpar campos
        setDescription("");
        setAmount("");
        setCategory("");
        setType("income");
      } else {
        alert("Erro ao salvar transação.");
      }
    } catch (error) {
      console.error("Erro ao conectar com o servidor:", error);
      alert("Erro de conexão com o servidor.");
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 group"
      >
        <Plus size={24} />

        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-medium">
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold text-sm transition-colors mt-4"
          >
            Salvar Transação
          </button>
        </form>
      </div>
    </div>
  );
}
