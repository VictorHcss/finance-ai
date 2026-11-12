import { Plus } from "lucide-react";
import { SectionHeading } from "./ui";

const FAQ = [
  {
    question: "Preciso pagar para usar o Finance.AI?",
    answer: "Não. Você cria a conta e usa todos os recursos gratuitamente, sem cadastrar cartão de crédito.",
  },
  {
    question: "Meus dados financeiros ficam visíveis para outras pessoas?",
    answer:
      "Não. Cada conta tem autenticação própria e só acessa os próprios dados — isso é verificado por testes automáticos com várias contas ao mesmo tempo. As senhas são guardadas com hash (PBKDF2), nunca em texto puro.",
  },
  {
    question: "Como os insights são gerados?",
    answer:
      "A partir do histórico real das suas transações: categoria de gasto dominante, despesas recorrentes, tendência de receita e mudanças de comportamento mês a mês. Cada insight mostra a comparação entre os períodos e o que mais contribuiu — não são dicas genéricas.",
  },
  {
    question: "Consigo importar o extrato do meu banco?",
    answer:
      "Sim. O Finance.AI aceita arquivos CSV e OFX, que a maioria dos bancos exporta. Você revisa as transações antes de confirmar, e lançamentos repetidos são identificados para não duplicar.",
  },
  {
    question: "Vai ter aplicativo para celular?",
    answer:
      "Sim, estamos trabalhando nas versões Android e iOS. Até lá, a versão web funciona bem no navegador do celular, com a mesma conta.",
  },
  {
    question: "O que acontece se o servidor ficar fora do ar?",
    answer:
      "O Finance.AI passa a funcionar em modo local, no próprio navegador, para você não ficar sem acesso. Os dados criados nesse modo ficam só naquele aparelho e não são sincronizados com a sua conta.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading
          align="left"
          eyebrow="Dúvidas"
          title="Perguntas frequentes"
          description="Não achou o que procurava? Crie uma conta de teste ou explore a demonstração — leva um minuto."
        />

        <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {FAQ.map((item, index) => (
            <details key={item.question} className="group" open={index === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-left text-base font-semibold text-zinc-100 transition-colors hover:text-emerald-300">
                {item.question}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition-colors group-hover:border-emerald-400/40 group-hover:text-emerald-300">
                  <Plus size={16} className="faq-icon transition-transform duration-200" />
                </span>
              </summary>
              <p className="pb-6 pr-12 text-sm leading-relaxed text-zinc-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
