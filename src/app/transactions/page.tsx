import { Search, Filter, Download } from "lucide-react";

const allTransactions = [
  {
    id: 1,
    desc: "Salário Mensal",
    cat: "Trabalho",
    val: 5000,
    date: "20/04/2026",
    type: "income",
  },
  {
    id: 2,
    desc: "Aluguel",
    cat: "Moradia",
    val: 1500,
    date: "01/04/2026",
    type: "expense",
  },
  {
    id: 3,
    desc: "Freelance",
    cat: "Trabalho",
    val: 2000,
    date: "15/04/2026",
    type: "income",
  },
  {
    id: 4,
    desc: "Supermercado",
    cat: "Alimentação",
    val: 300,
    date: "10/04/2026",
    type: "expense",
  },
  {
    id: 5,
    desc: "Internet",
    cat: "Serviços",
    val: 100,
    date: "05/04/2026",
    type: "expense",
  },
  {
    id: 6,
    desc: "Venda de Item Usado",
    cat: "Vendas",
    val: 250,
    date: "12/04/2026",
    type: "income",
  },
  {
    id: 7,
    desc: "Presente de Aniversário",
    cat: "Presentes",
    val: 150,
    date: "20/04/2026",
    type: "expense",
  },
  {
    id: 8,
    desc: "Investimento em Ações",
    cat: "Investimentos",
    val: 1000,
    date: "18/04/2026",
    type: "income",
  },
  {
    id: 9,
    desc: "Assinatura de Streaming",
    cat: "Entretenimento",
    val: 50,
    date: "08/04/2026",
    type: "expense",
  },
];

export default function TransactionsPage() {
  return (
    <main className="p-8 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="text-zinc-400 text-sm">
            Gerencie seu histórico financeiro completo.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Download size={18} />
          Exportar CSV
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar transação..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-sm hover:bg-zinc-800">
            <Filter size={18} />
            Filtros
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {allTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4 text-sm font-medium">{t.desc}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md text-xs">
                    {t.cat}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">{t.date}</td>
                <td
                  className={`px-6 py-4 text-sm font-bold text-right ${t.type === "income" ? "text-emerald-500" : "text-zinc-200"}`}
                >
                  {t.type === "income" ? "+ " : "- "}
                  {t.val.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
