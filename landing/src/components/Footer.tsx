import { appLinks, sectionLinks } from "@/lib/links";
import { Logo } from "./ui";

export function Footer() {
  const columns = [
    { title: "Produto", links: sectionLinks },
    {
      title: "Conta",
      links: [
        { href: appLinks.login, label: "Entrar" },
        { href: appLinks.register, label: "Criar conta" },
        { href: appLinks.demo, label: "Demonstração" },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
            Controle financeiro pessoal com insights gerados a partir do seu histórico real.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-zinc-200">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-zinc-500 transition-colors hover:text-zinc-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-600 sm:px-6">
          © {new Date().getFullYear()} Finance.AI. Os valores exibidos nesta página são ilustrativos.
        </p>
      </div>
    </footer>
  );
}
