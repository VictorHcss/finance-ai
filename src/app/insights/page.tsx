"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Lightbulb, Target, Zap } from "lucide-react";

export default function InsightsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/insights")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Erro ao conectar com o Python:", err));
  }, []);

  return (
    <main className="p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <BrainCircuit className="w-6 h-6 text-emerald-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Insights de IA</h1>
          <p className="text-zinc-400 text-sm font-mono">
            Status do Backend: {data ? "Conectado" : "Conectando..."}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-500">
            <Zap size={20} />
            <h3 className="font-bold">Análise do Cérebro Python</h3>
          </div>
          <p className="text-zinc-300 text-sm">
            {data?.alerta || "Carregando análises..."}
          </p>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Target size={20} />
            <h3 className="font-bold">Projeção Próximo Mês</h3>
          </div>
          <p className="text-3xl font-bold">
            {data ? `R$ ${data.previsao_proximo_mes.toFixed(2)}` : "---"}
          </p>
        </div>
      </div>
    </main>
  );
}
