"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

export function NewTransactionModal() {
  const [isOpen, setIsOpen] = useState(false);

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

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Venda de produto"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                Valor
              </label>
              <input
                type="number"
                placeholder="R$ 0,00"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                Tipo
              </label>
              <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500">
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold text-sm transition-colors mt-4">
            Salvar Transação
          </button>
        </form>
      </div>
    </div>
  );
}
