"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BrainCircuit,
  Target,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Info,
} from "lucide-react";
import { storage } from "@/lib/storage";
import type { InsightData, InsightEntry } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { useHandleFetchError } from "@/hooks/useHandleFetchError";

export default function InsightsPage() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const handleFetchError = useHandleFetchError();

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const json = await storage.getInsights();
      if (json) {
        setData(json);
      } else {
        setError(true);
      }
    } catch (err) {
      await handleFetchError(err, "Erro ao carregar insights:");
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [handleFetchError]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (error) {
    return (
      <AppLayout>
      <main className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle size={48} className="text-rose-500" />
        <h2 className="text-xl font-bold">Erro ao carregar insights</h2>
        <p className="text-zinc-500">Verifique se o servidor backend está online.</p>
        <button 
          onClick={loadInsights}
          className="bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
    <main className="space-y-8 animate-in fade-in duration-500">
      {/* Header com Status Dinâmico */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Insights de IA</h1>
            <p className="text-zinc-400 text-sm font-mono">
              Status da IA:{" "}
              {!loading && data ? (
                <span className="text-emerald-500">Sincronizado</span>
              ) : (
                <span className="text-amber-500">Processando dados...</span>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card IA: Análise Narrativa */}
        <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4 relative overflow-hidden min-h-[200px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BrainCircuit size={80} className="text-emerald-500" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <Zap size={20} />
              <h3 className="font-bold uppercase text-xs tracking-widest">Análise Transparente</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-emerald-500/10 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-emerald-500/10 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-emerald-500/10 rounded w-4/6 animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {data?.alerta}
                </p>
                <div className="text-zinc-400 text-xs flex items-start gap-2 bg-black/20 p-3 rounded-lg border border-emerald-500/10">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-300">Como chegamos a esse resultado:</p>
                    <p>
                      Analisamos o histórico de gastos dos últimos meses. 
                      Sua média foi de <strong>{formatCurrency(data?.media_gastos || 0)}</strong>. 
                      A variação de <strong>{data?.variacao_percentual}%</strong> foi aplicada para a projeção.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Projeção: Valor e Tendência */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2 text-blue-400">
            <Target size={20} />
            <h3 className="font-bold uppercase text-xs tracking-widest">Projeção Próximo Mês</h3>
          </div>

          <div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-10 bg-zinc-800 rounded w-48 animate-pulse"></div>
                <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse"></div>
              </div>
            ) : (
              <>
                <p className="text-4xl font-bold tracking-tight text-white">
                  {formatCurrency(data?.previsao_proximo_mes || 0)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-zinc-500 text-xs italic">
                  <TrendingUp size={14} />
                  <span>Baseado na média móvel e tendência identificada.</span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Média Mensal</p>
              <p className={`text-sm font-medium ${loading ? 'h-4 bg-zinc-800 rounded w-16 animate-pulse' : 'text-white'}`}>
                {data && formatCurrency(data.media_gastos)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Variação</p>
              <p className={`text-sm font-medium flex items-center gap-1 ${loading ? 'h-4 bg-zinc-800 rounded w-16 animate-pulse' : (data?.variacao_percentual && data.variacao_percentual > 0 ? 'text-rose-400' : 'text-emerald-400')}`}>
                {!loading && data && (
                  <>
                    {data.variacao_percentual > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(data.variacao_percentual)}%
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Histórico Real */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-300">
          <TrendingUp className="text-emerald-500" size={20} />
          Histórico de Gastos Analisados
        </h2>
        
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 h-[350px] w-full relative">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <span className="text-zinc-500 text-sm">Carregando dados históricos...</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.historico}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                  labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                  formatter={(value: number) => [formatCurrency(value), 'Gastos']}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValor)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Sugestões de Otimização — geradas a partir das transações e
          metas reais do usuário (categoria dominante, despesas
          recorrentes, pressão de fluxo de caixa, tendência de receita
          e projeção de metas). Nada aqui é texto fixo. */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-300">
          <CheckCircle2 className="text-emerald-500" size={20} />
          Sugestões de Otimização
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 h-24 animate-pulse" />
            ))}
          </div>
        ) : !data?.insights?.length ? (
          <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800 text-center text-sm text-zinc-500">
            Nenhuma sugestão disponível ainda. Adicione mais transações para liberar análises.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </section>
    </main>
    </AppLayout>
  );
}

const INSIGHT_ICON: Record<InsightEntry["type"], typeof AlertCircle> = {
  expense: AlertCircle,
  income: TrendingUp,
  cashflow: TrendingDown,
  goal: Target,
  risk: AlertCircle,
  opportunity: CheckCircle2,
};

const SEVERITY_COLOR: Record<InsightEntry["severity"], string> = {
  high: "text-rose-500",
  medium: "text-amber-500",
  low: "text-emerald-500",
};

function InsightCard({ insight }: { insight: InsightEntry }) {
  const Icon = INSIGHT_ICON[insight.type] ?? Info;
  const color = SEVERITY_COLOR[insight.severity] ?? "text-zinc-400";

  return (
    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-start gap-3 hover:border-zinc-700 transition-colors">
      <Icon className={`${color} shrink-0 mt-1`} size={18} />
      <div className="min-w-0">
        <p className="text-sm text-zinc-300 font-bold mb-1">{insight.title}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{insight.message}</p>
        {insight.metric_label && insight.metric_value && (
          <p className="text-[11px] text-zinc-600 mt-1.5 uppercase tracking-wide">
            {insight.metric_label}:{" "}
            <span className="text-zinc-400 normal-case">{insight.metric_value}</span>
          </p>
        )}
      </div>
    </div>
  );
}
