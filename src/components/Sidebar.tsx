import {
  LayoutDashboard,
  Wallet,
  Receipt,
  TrendingUp,
  Settings,
  BrainCircuit,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Receipt, label: "Transações", active: false },
  { icon: Wallet, label: "Planejamento", active: false },
  { icon: BrainCircuit, label: "Insights IA", active: false },
  { icon: Settings, label: "Configurações", active: false },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div className="p-6">
        <h1 className="text-emerald-500 font-bold text-xl tracking-tight">
          FINANCE.AI
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              item.active
                ? "bg-emerald-500/10 text-emerald-500"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-emerald-500">
            VH
          </div>
          <span className="text-sm font-medium text-zinc-300">Victor H.</span>
        </div>
      </div>
    </aside>
  );
}
