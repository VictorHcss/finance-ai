import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const transactions = [
  {
    id: 1,
    description: "Salário Mensal",
    category: "Trabalho",
    amount: 5000,
    date: "20/04/2026",
    type: "income",
  },
  {
    id: 2,
    description: "Aluguel",
    category: "Moradia",
    amount: 1500,
    date: "01/04/2026",
    type: "expense",
  },
  {
    id: 3,
    description: "Freelance",
    category: "Trabalho",
    amount: 2000,
    date: "15/04/2026",
    type: "income",
  },
  {
    id: 4,
    description: "Supermercado",
    category: "Alimentação",
    amount: 300,
    date: "10/04/2026",
    type: "expense",
  },
  {
    id: 5,
    description: "Investimentos",
    category: "Patrimônio",
    amount: 1000,
    date: "25/04/2026",
    type: "income",
  },
  {
    id: 6,
    description: "Academia",
    category: "Saúde",
    amount: 100,
    date: "12/04/2026",
    type: "expense",
  },
  {
    id: 7,
    description: "Transporte",
    category: "Transporte",
    amount: 200,
    date: "18/04/2026",
    type: "expense",
  },
  {
    id: 8,
    description: "Venda de item usado",
    category: "Outros",
    amount: 150,
    date: "22/04/2026",
    type: "income",
  },
];

export function TransactionList() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-zinc-100">Transações Recentes</h3>
        <button className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors">
          Ver todas
        </button>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/30 transition-colors border border-transparent hover:border-zinc-800"
          >
            <div className="flex items-center gap-4">
              {t.type === "income" ? (
                <ArrowUpCircle className="text-emerald-500" size={24} />
              ) : (
                <ArrowDownCircle className="text-rose-500" size={24} />
              )}
              <div>
                <p className="font-medium text-sm text-zinc-200">
                  {t.description}
                </p>
                <p className="text-xs text-zinc-500">{t.category}</p>
              </div>
            </div>

            <div className="text-right">
              <p
                className={`font-semibold text-sm ${t.type === "income" ? "text-emerald-500" : "text-zinc-100"}`}
              >
                {t.type === "income" ? `+ ` : `- `}
                {t.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <p className="text-xs text-zinc-500">{t.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
