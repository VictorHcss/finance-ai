"use client";

import { useEffect, useState } from "react";
import { User, Bell, Database } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useHandleFetchError } from "@/hooks/useHandleFetchError";
import type { UserSettings } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { addToast } = useToast();
  const handleFetchError = useHandleFetchError();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    storage
      .getSettings()
      .then(setSettings)
      .catch((err) => handleFetchError(err, "Erro ao carregar configurações:"));
  }, [handleFetchError]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await storage.updateProfile({ name, email });
      await refreshUser();
      addToast("success", "Perfil atualizado com sucesso!");
    } catch (err) {
      await handleFetchError(err, "Erro ao atualizar perfil:");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleToggle(key: "notifications_enabled" | "ai_enabled") {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingSettings(true);
    try {
      const updated = await storage.updateSettings({ [key]: next[key] });
      setSettings(updated);
    } catch (err) {
      setSettings(settings);
      await handleFetchError(err, "Erro ao salvar preferência:");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleClearHistory() {
    if (!confirm("Isso vai apagar TODAS as suas transações. Essa ação não pode ser desfeita. Continuar?")) return;
    setClearing(true);
    try {
      const transactions = await storage.getTransactions();
      await Promise.all(
        transactions
          .filter((t) => t.id !== undefined)
          .map((t) => storage.deleteTransaction(t.id as number)),
      );
      window.dispatchEvent(new Event("transactions-changed"));
      addToast("success", "Histórico de transações apagado.");
    } catch (err) {
      await handleFetchError(err, "Erro ao limpar histórico:");
    } finally {
      setClearing(false);
    }
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Isso vai excluir sua conta e TODOS os seus dados (transações, metas, notificações) permanentemente. Essa ação não pode ser desfeita. Continuar?",
      )
    )
      return;
    setDeleting(true);
    try {
      await storage.deleteAccount();
      addToast("success", "Conta excluída.");
      await logout();
    } catch (err) {
      await handleFetchError(err, "Erro ao excluir conta:");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <main className="space-y-8">
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
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {savingProfile ? "Salvando..." : "Salvar alterações"}
              </button>
            </form>
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
                checked={settings?.notifications_enabled ?? true}
                disabled={!settings || savingSettings}
                onToggle={() => handleToggle("notifications_enabled")}
              />
              <ToggleItem
                title="Insights Semanais da IA"
                description="Permitir que a IA analise seus hábitos para sugerir economias."
                checked={settings?.ai_enabled ?? true}
                disabled={!settings || savingSettings}
                onToggle={() => handleToggle("ai_enabled")}
              />
            </div>
          </section>

          {/* Seção: Dados */}
          <section className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
            <div className="flex items-center gap-2 text-rose-500 mb-2">
              <Database size={20} />
              <h3 className="font-bold">Gerenciar Dados</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
              >
                {clearing ? "Limpando..." : "Limpar Histórico"}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="text-sm text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
              >
                {deleting ? "Excluindo..." : "Excluir Conta"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}

function ToggleItem({
  title,
  description,
  checked,
  disabled,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 gap-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={onToggle}
        className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors shrink-0 disabled:opacity-50 ${
          checked ? "bg-emerald-600 justify-end" : "bg-zinc-700 justify-start"
        }`}
      >
        <div className="w-3 h-3 bg-white rounded-full" />
      </button>
    </div>
  );
}
