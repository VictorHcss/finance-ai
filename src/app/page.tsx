"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BrainCircuit,
  LineChart,
  Target,
  Bell,
  ShieldCheck,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const FEATURES = [
  {
    icon: LineChart,
    title: "Visão completa das finanças",
    description:
      "Saldo, entradas, saídas e fluxo mensal em um dashboard único — sem precisar abrir planilha nenhuma.",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    icon: Target,
    title: "Metas com progresso real",
    description:
      "Crie metas, registre depósitos e acompanhe o percentual concluído até bater o objetivo.",
    color: "text-blue-400 bg-blue-400/10",
  },
  {
    icon: BrainCircuit,
    title: "Insights inteligentes",
    description:
      "Projeções de gastos e análise de tendência a partir do seu próprio histórico financeiro.",
    color: "text-purple-400 bg-purple-400/10",
  },
  {
    icon: Bell,
    title: "Central de notificações",
    description:
      "Avisos de gastos fora do padrão e atualizações das suas metas, tudo em um só lugar.",
    color: "text-amber-400 bg-amber-400/10",
  },
  {
    icon: ShieldCheck,
    title: "Seus dados, só seus",
    description:
      "Autenticação real por conta e isolamento completo de dados — ninguém além de você vê suas finanças.",
    color: "text-rose-400 bg-rose-400/10",
  },
  {
    icon: Wallet,
    title: "Controle total das transações",
    description:
      "Registre, edite e organize entradas e saídas por categoria com poucos cliques.",
    color: "text-teal-400 bg-teal-400/10",
  },
];

export default function LandingPage() {
  const { session, loading, login } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  // Quem já está logado não precisa ver a landing — manda direto pro app
  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  async function handleTryDemo() {
    setDemoLoading(true);
    try {
      await login("demo@finance.ai", "demo123456");
      router.push("/dashboard");
    } catch {
      addToast(
        "error",
        "Não foi possível abrir a demonstração agora. Tente novamente em instantes.",
      );
    } finally {
      setDemoLoading(false);
    }
  }

  if (loading || session) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800/60 sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-black font-bold text-sm">$</span>
            </div>
            <span className="font-bold tracking-tight text-emerald-500">
              FINANCE.AI
            </span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-14 sm:pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
          <Sparkles size={13} />
          Controle financeiro com apoio de análise inteligente
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
          Entenda para onde vai o seu dinheiro —{" "}
          <span className="text-emerald-500">antes que ele acabe.</span>
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg mt-5 max-w-xl mx-auto">
          Transações, metas e projeções em um só painel. Sem planilha,
          sem letra miúda, sem complicação.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            Criar minha conta grátis
            <ArrowRight size={18} />
          </Link>
          <button
            onClick={handleTryDemo}
            disabled={demoLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold px-6 py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {demoLoading ? "Abrindo demonstração..." : "Ver demonstração ao vivo"}
          </button>
        </div>
        <p className="text-zinc-600 text-xs mt-4">
          A demonstração usa uma conta de exemplo com dados fictícios — não é preciso cadastro.
        </p>
      </section>

      {/* Preview ilustrativo do produto */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4 shadow-2xl shadow-black/40">
          <div className="rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800/60">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs text-zinc-500">Saldo Total</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">R$ 5.207,30</p>
                <p className="text-xs text-emerald-500 mt-1">+12% vs. mês anterior</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs text-zinc-500">Entradas</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-500">R$ 7.700,00</p>
                <p className="text-xs text-zinc-500 mt-1">Salário + renda extra</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs text-zinc-500">Saídas</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">R$ 3.190,50</p>
                <p className="text-xs text-zinc-500 mt-1">Dentro da média mensal</p>
              </div>
            </div>
            <div className="px-4 sm:px-6 pb-5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-400/10 flex items-center justify-center shrink-0">
                  <BrainCircuit size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Meta &quot;Viagem para o Nordeste&quot;</p>
                  <p className="text-xs text-zinc-500">31% concluída · faltam R$ 2.750,00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tudo que você precisa para organizar sua vida financeira
          </h2>
          <p className="text-zinc-400 mt-3 max-w-lg mx-auto">
            Cada recurso pensado para reduzir o esforço de manter suas
            finanças em dia.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}
              >
                <feature.icon size={20} />
              </div>
              <h3 className="font-semibold mb-1.5">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-900/40 to-zinc-900/40 p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Comece a organizar suas finanças hoje
          </h2>
          <p className="text-zinc-400 mt-3 max-w-md mx-auto">
            Gratuito para começar. Leva menos de um minuto para criar sua conta.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-7 py-3 rounded-xl transition-all active:scale-[0.98] mt-7 shadow-lg shadow-emerald-500/20"
          >
            Criar minha conta grátis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <span>© {new Date().getFullYear()} Finance.AI</span>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Entrar
            </Link>
            <Link href="/register" className="hover:text-zinc-300 transition-colors">
              Criar conta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
