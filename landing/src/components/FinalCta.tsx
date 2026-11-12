import { ArrowRight, PlayCircle } from "lucide-react";
import { appLinks } from "@/lib/links";
import { ButtonLink } from "./ui";

export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="reveal ring-gradient relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-zinc-900 px-6 py-16 text-center sm:px-12 sm:py-20">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />
        <div aria-hidden className="absolute -bottom-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/25 blur-[100px]" />
        <div aria-hidden className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-ai-500/20 blur-[90px]" />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl sm:leading-[1.08]">
            Daqui a um mês, você vai saber <span className="text-gradient">exatamente</span> para onde foi cada real.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-zinc-400">
            Comece hoje. Leva menos de um minuto e não pede cartão.
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <ButtonLink href={appLinks.register} size="lg">
              Criar conta grátis
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </ButtonLink>
            <ButtonLink href={appLinks.demo} variant="secondary" size="lg">
              <PlayCircle size={18} className="text-emerald-400" />
              Ver a demonstração
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
