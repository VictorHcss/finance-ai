import {
  BrainCircuit,
  Lightbulb,
  TrendingDown,
  Target,
  Zap,
} from "lucide-react";

export default function InsightsPage() {
  return (
    <main className="p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <BrainCircuit className="text-emerald-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Insights de IA</h1>
          <p className="text-zinc-400 text-sm">
            Análise preditiva baseada nos seus hábitos de consumo.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-500">
            <Zap size={20} />
            <h3 className="font-bold">Otimização Próxima</h3>
          </div>
          <p className="text-zinc-300 text-sm">
            Detectamos que suas assinaturas de streaming representam 8% da sua
            renda mensal. Cancelando serviços não utilizados, você poderia
            economizar <strong>R$ 1.200,00 por ano</strong>.
          </p>
          <button className="text-xs font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400">
            Ver detalhes da análise
          </button>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Target size={20} />
            <h3 className="font-bold">Projeção para o próximo mês</h3>
          </div>
          <p className="text-zinc-300 text-sm">
            Com base no seu histórico, a previsão de gastos para Maio é de{" "}
            <strong>R$ 3.100,00</strong>. Isso está 5% abaixo da sua média
            atual. Bom trabalho!
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Lightbulb className="text-yellow-500" size={20} />
          Plano de Ação Sugerido
        </h3>

        <div className="space-y-3">
          <ActionItem
            title="Reduzir gastos com Alimentação fora de casa"
            desc="Sua meta era R$ 400, mas você já gastou R$ 450 este mês."
            type="warning"
          />
          <ActionItem
            title="Aporte Extra em Investimentos"
            desc="Você possui um saldo remanescente de R$ 500 que pode ser aplicado."
            type="success"
          />
        </div>
      </section>
    </main>
  );
}

function ActionItem({
  title,
  desc,
  type,
}: {
  title: string;
  desc: string;
  type: "success" | "warning";
}) {
  return (
    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between items-center">
      <div>
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
      <div
        className={`h-2 w-2 rounded-full ${type === "success" ? "bg-emerald-500" : "bg-yellow-500"}`}
      />
    </div>
  );
}
