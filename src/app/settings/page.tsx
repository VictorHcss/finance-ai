import { User, Bell, Shield, Palette, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <main className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-zinc-400 text-sm">
          Gerencie suas preferências e dados da conta.
        </p>
      </header>

      <div className="max-w-4xl space-y-6">
        {/* Seção: Perfil */}
        <section className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <User size={20} />
            <h3 className="font-bold">Perfil do Usuário</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                Nome
              </label>
              <input
                type="text"
                placeholder="Victor Henrique"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                E-mail
              </label>
              <input
                type="email"
                placeholder="victor@exemplo.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* Seção: IA e Notificações */}
        <section className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Bell size={20} />
            <h3 className="font-bold">Notificações e IA</h3>
          </div>
          <div className="space-y-3">
            <ToggleItem
              title="Alertas de Gastos Críticos"
              description="Receber aviso quando ultrapassar 80% do orçamento."
            />
            <ToggleItem
              title="Insights Semanais da IA"
              description="Permitir que a IA analise seus hábitos para sugerir economias."
            />
          </div>
        </section>

        {/* Seção: Dados */}
        <section className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
          <div className="flex items-center gap-2 text-rose-500 mb-2">
            <Database size={20} />
            <h3 className="font-bold">Gerenciar Dados</h3>
          </div>
          <div className="flex gap-4">
            <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors">
              Limpar Histórico
            </button>
            <button className="text-sm text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 px-4 py-2 rounded-lg transition-colors">
              Excluir Conta
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ToggleItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <div className="w-10 h-5 bg-emerald-600 rounded-full flex items-center px-1">
        <div className="w-3 h-3 bg-white rounded-full ml-auto" />
      </div>
    </div>
  );
}
