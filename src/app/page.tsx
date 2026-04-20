import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-8 bg-zinc-950 text-zinc-50">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance AI</h1>
          <p className="text-zinc-400">
            Bem-vindo, Victor. Veja seus insights hoje.
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
          <span className="text-emerald-500 font-medium">V</span>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm text-zinc-400">Saldo Total</p>
          <h2 className="text-3xl font-bold mt-2">R$ 4.250,00</h2>
        </div>
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm text-zinc-400 text-emerald-400">Entradas</p>
          <h2 className="text-3xl font-bold mt-2 text-emerald-500">
            + R$ 1.200,00
          </h2>
        </div>
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm text-zinc-400 text-rose-400">Saídas</p>
          <h2 className="text-3xl font-bold mt-2 text-rose-500">- R$ 460,00</h2>
        </div>
      </section>
    </main>
  );
}
