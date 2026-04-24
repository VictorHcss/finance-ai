import { Target, Trophy, Plus, Calendar } from "lucide-react";

const goals = [
  {
    id: 1,
    title: "Viagem de Maio",
    target: 500,
    current: 320,
    deadline: "01/05/2026",
    color: "bg-emerald-500",
  },
  {
    id: 2,
    title: "Reserva de Emergência",
    target: 2000,
    current: 800,
    deadline: "31/12/2026",
    color: "bg-blue-500",
  },
  {
    id: 3,
    title: "Novo Equipamento",
    target: 1200,
    current: 150,
    deadline: "15/08/2026",
    color: "bg-purple-500",
  },
];

export default function PlanningPage() {
  return (
    <main className="p-8 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Planejamento</h1>
          <p className="text-zinc-400 text-sm">
            Defina e acompanhe suas metas financeiras.
          </p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Nova Meta
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = (goal.current / goal.target) * 100;
          return (
            <div
              key={goal.id}
              className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-300">
                  <Target size={20} />
                </div>
                <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                  <Calendar size={14} />
                  {goal.deadline}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-zinc-100">{goal.title}</h3>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-zinc-400">Progresso</span>
                  <span className="text-zinc-100 font-medium">
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${goal.color} transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">
                    Atual
                  </p>
                  <p className="text-sm font-bold text-zinc-100">
                    R$ {goal.current}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase font-bold">
                    Meta
                  </p>
                  <p className="text-sm font-bold text-emerald-500">
                    R$ {goal.target}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 flex gap-4 items-start">
        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
          <Trophy size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-400">Dica de Planejamento</h4>
          <p className="text-sm text-zinc-300 mt-1">
            Com base no seu saldo atual e gastos fixos, você consegue atingir a
            meta <strong>"Viagem de Maio"</strong> em mais 12 dias se mantiver o
            ritmo de vendas atual.
          </p>
        </div>
      </section>
    </main>
  );
}
