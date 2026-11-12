import { FileUp, Lock, Smartphone, Sparkles } from "lucide-react";

// Faixa de diferenciais concretos — no lugar de números de "usuários"
// ou logos de empresas que o produto ainda não tem.
const ITEMS = [
  { icon: Sparkles, title: "Insights explicados", text: "Com valor atual, anterior e o que mudou" },
  { icon: FileUp, title: "Extrato em segundos", text: "CSV e OFX, sem duplicar lançamentos" },
  { icon: Lock, title: "Seus dados, só seus", text: "Cada conta isolada das demais" },
  { icon: Smartphone, title: "Feito para o celular", text: "E com app nativo a caminho" },
];

export function Highlights() {
  return (
    <section aria-label="Diferenciais" className="border-y border-white/5 bg-zinc-900/30">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
              <Icon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
