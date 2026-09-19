"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LineChart,
  Wallet,
  Target,
  BrainCircuit,
  Bell,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

const INCLUDED = [
  { icon: LineChart, label: "Dashboard financeiro completo" },
  { icon: Wallet, label: "Transações ilimitadas, com categorias" },
  { icon: Target, label: "Metas com acompanhamento de progresso" },
  { icon: BrainCircuit, label: "Insights baseados no seu histórico" },
  { icon: Bell, label: "Central de notificações" },
  { icon: UploadCloud, label: "Importação e exportação de dados" },
  { icon: ShieldCheck, label: "Conta com autenticação e dados isolados" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800/60 sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <span className="text-black font-bold text-xs sm:text-sm">$</span>
            </div>
            <span className="font-bold tracking-tight text-emerald-500 text-sm sm:text-base whitespace-nowrap">
              FINANCE.AI
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-14 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Preços</h1>
        <p className="text-zinc-400 text-base sm:text-lg mt-4 max-w-xl mx-auto">
          O Finance.AI é gratuito por enquanto. Sem plano pago, sem cartão de crédito, sem
          limite artificial no que você pode fazer com suas próprias finanças.
        </p>
      </section>

      <section className="max-w-md mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-900/40 to-zinc-900/40 p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Plano gratuito
          </p>
          <p className="text-4xl font-bold tracking-tight mt-2">
            R$ 0<span className="text-base font-medium text-zinc-500"> / mês</span>
          </p>
          <p className="text-sm text-zinc-400 mt-2">
            Tudo que existe hoje no Finance.AI, sem letras miúdas.
          </p>
          <ul className="mt-6 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <Check size={13} />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            Criar minha conta grátis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Transparência sobre o futuro — só como possibilidade, nunca como oferta real */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 text-center">
          <h2 className="font-semibold text-zinc-200">E no futuro?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mt-3">
            O Finance.AI pode vir a ganhar diferentes níveis de acesso conforme o produto evolui.
            Isso é uma possibilidade em aberto, não um anúncio: hoje não existe nenhum plano pago,
            nenhuma cobrança e nenhuma data definida para isso mudar. Se um dia mudar, você vai
            saber com antecedência — e o que já está disponível gratuitamente não deixa de existir
            por causa disso.
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <span>© {new Date().getFullYear()} Finance.AI</span>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-zinc-300 transition-colors">
              Início
            </Link>
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
