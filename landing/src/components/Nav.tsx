import { appLinks, sectionLinks } from "@/lib/links";
import { ButtonLink, Logo } from "./ui";
import { MobileMenu } from "./MobileMenu";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/55">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Seções" className="hidden items-center gap-1 lg:flex">
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <ButtonLink href={appLinks.login} variant="ghost" size="sm">
            Entrar
          </ButtonLink>
          <ButtonLink href={appLinks.register} size="sm">
            Criar conta grátis
          </ButtonLink>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
