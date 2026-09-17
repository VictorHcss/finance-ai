# Guia de estudo do Finance.AI (pra você entender o próprio projeto)

Esse documento é pra você, sem frescura de "documentação oficial". A ideia é
que você consiga ler isso, entender o que existe no projeto, entender o que
eu mexi no layout e por quê, e sair sabendo mexer nisso sozinho da próxima
vez. Onde fizer sentido, comparo com coisas do dia a dia pra grudar melhor.

---

## 1. O panorama geral: duas aplicações, um projeto

Seu "Finance.AI" na verdade são **dois programas separados que conversam por
HTTP**:

```
finance-ai-ui-audit/
├── src/            <- o FRONTEND (o que roda no navegador)
├── backend/        <- o BACKEND (a API que guarda os dados)
├── package.json    <- dependências e comandos do frontend
└── docs/           <- esse guia e outras anotações
```

- **Frontend** = Next.js (que por baixo é React) + TypeScript + Tailwind CSS.
  É tudo o que roda no navegador da pessoa: telas, botões, formulários.
- **Backend** = FastAPI (Python) + SQLite. É o "cofre": guarda usuários,
  transações, metas, e expõe isso como uma API (endereços tipo
  `/api/transactions` que devolvem JSON).

Pensa assim: o frontend é o balcão de atendimento (o que o cliente vê e
mexe), o backend é o estoque lá nos fundos (onde os dados realmente moram).
Quando você clica em "Salvar transação", o frontend manda um pedido HTTP
pro backend, o backend salva no banco SQLite e responde "ok, salvei".

Rodar os dois juntos: `npm run dev:all` (ele sobe o backend com uvicorn e o
frontend com `next dev` ao mesmo tempo — olha o `package.json`).

---

## 2. Como o frontend está organizado

Dentro de `src/`, cada pasta tem um papel:

| Pasta | O que vive ali |
|---|---|
| `app/` | As **páginas** de verdade (rotas). Cada `page.tsx` dentro de uma pasta vira uma URL: `app/dashboard/page.tsx` → `/dashboard`. Isso é o "App Router" do Next.js. |
| `components/` | Pedaços de tela reutilizáveis que não são uma página inteira: `Sidebar`, `Navbar`, os modais, os cards. |
| `components/ui/` | Os "tijolinhos" mais genéricos (Button, Card, Dialog, Badge...). São a base visual que os componentes maiores usam por cima. |
| `contexts/` | Estado **global** que várias telas precisam ao mesmo tempo (ver seção 4). |
| `lib/` | Funções que não são componentes visuais: chamar a API, formatar coisas, ler/gravar localStorage. |
| `features/notifications/` | Um "mini-módulo" só de notificações, com seus próprios tipos, hooks e componentes — separado porque é uma funcionalidade grande o suficiente pra merecer a própria pastinha. |
| `hooks/` | Hooks customizados (funções `useAlgumaCoisa` que você mesmo escreveu). |

### `"use client"` — o que é isso no topo de quase todo arquivo?

O Next.js, por padrão, tenta renderizar tudo **no servidor** (mais rápido
pra carregar, melhor pra SEO). Mas qualquer componente que usa `useState`,
`useEffect`, `onClick`, ou qualquer coisa que só existe no navegador,
precisa avisar: "ei, eu preciso rodar no navegador mesmo". É isso que a
linha `"use client";` no topo do arquivo faz. Quase tudo no seu projeto tem
essa linha porque é um app bem interativo (formulários, cliques, estado).

---

## 3. Os conceitos de React que aparecem toda hora

Se você travar lendo o código, é bem provável que seja um desses quatro:

### `useState` — "uma variável que, quando muda, redesenha a tela"

```tsx
const [isOpen, setIsOpen] = useState(false);
```

`isOpen` é o valor atual (começa `false`). `setIsOpen` é a função que você
chama pra mudar esse valor — e toda vez que você chama, o React redesenha
o componente com o valor novo. É basicamente "essa peça de UI tem uma
memória própria".

### `useEffect` — "faça isso quando algo mudar (ou quando a tela aparecer)"

```tsx
useEffect(() => {
  fetchData();
  window.addEventListener("transactions-changed", fetchData);
  return () => window.removeEventListener("transactions-changed", fetchData);
}, [fetchData]);
```

Isso roda uma vez quando o componente aparece na tela (busca os dados) e
registra um "ouvinte" de evento. O `return () => ...` no final é a
**limpeza**: quando o componente sai da tela, ele desliga o ouvinte, pra não
vazar memória nem duplicar chamadas. O array `[fetchData]` no final diz
"só rode de novo se `fetchData` mudar" — é o "gatilho" do efeito.

### Context (`createContext` / `useContext`) — "uma variável global, só que React"

Olha o `AuthContext.tsx`: ele guarda quem é o usuário logado, e qualquer
componente do app consegue perguntar "quem é o usuário?" chamando
`useAuth()`, sem precisar passar essa informação de componente em
componente na mão (isso se chama "prop drilling" e é chato de manter).
O projeto tem três desses: `AuthContext` (sessão/login), `ToastContext`
(as notificações toast que aparecem no canto) e `DataContext`.

### Eventos customizados no `window` — o "sino" que várias telas escutam

Repara nesse padrão espalhado pelo projeto:

```tsx
window.dispatchEvent(new Event("transactions-changed"));
```

Isso é meio "gambiarra elegante": em vez de ter um gerenciador de estado
global tipo Redux, o projeto usa o próprio navegador como "sino". Quando
você cria uma transação em QUALQUER tela, ela toca esse sino
(`transactions-changed`). O Dashboard, o Extrato e o gráfico ficam
escutando esse sino (`window.addEventListener`) e se atualizam sozinhos.
Funciona bem pra um projeto desse tamanho; se crescer muito, vale trocar
por algo mais estruturado (tipo o React Query que já está no projeto, só
que meio subutilizado pra esse fim específico).

---

## 4. `lib/storage.ts` — o truque mais esperto do projeto

Esse arquivo é o que toda tela chama pra ler/gravar dados (`storage.getTransactions()`,
`storage.createGoal()` etc). Mas por baixo dele tem uma decisão de
arquitetura bacana: ele testa se o backend (`API_URL`) está disponível e,
se não estiver, **cai automaticamente pro `localStorage`** do navegador
(veja `lib/localStorage.ts`). Ou seja: o app funciona mesmo com o backend
FastAPI desligado — ele só passa a guardar tudo localmente no navegador em
vez do SQLite. É por isso que toda tela chama `storage.algumaCoisa()` e
nunca `fetch()` direto: assim ela nem precisa saber qual dos dois modos
está ativo.

---

## 5. Como o Tailwind está montado aqui

Tailwind é "CSS por classe": em vez de escrever `.meu-botao { background: green }`
num arquivo `.css`, você escreve `className="bg-emerald-500"` direto no
componente. Vantagem: você vê o estilo ali, colado no elemento, sem pular
entre arquivos. Desvantagem: o `className` fica comprido — é o preço.

No seu projeto, três arquivos controlam isso:

1. **`tailwind.config.js`** — define a "paleta de tintas" disponível: quando
   você escreve `bg-zinc-900` ou `text-emerald-500`, é aqui que o Tailwind
   vai buscar o valor hexadecimal de cada tom.
2. **`src/app/globals.css`** — define **variáveis CSS** (`--background`,
   `--primary` etc.) usadas pelos componentes de `components/ui/` (Button,
   Card, Badge...). Por que variável em vez de classe Tailwind direto?
   Porque esses componentes são "genéricos" — não sabem se vão rodar num
   app claro ou escuro — então usam nomes neutros tipo `bg-card` que
   apontam pra variável, e a variável é o único lugar que sabe a cor de
   verdade.
3. Cada componente usa **classes Tailwind direto** (`bg-zinc-900`,
   `text-emerald-500`...) na maior parte do app — é o estilo mais comum
   aqui, mais rápido de escrever que ficar criando variável pra tudo.

### O que eu mudei aqui (e por quê)

Antes, `zinc` e `emerald` eram literalmente a paleta padrão do Tailwind —
os mesmos tons que qualquer projeto novo criado com `create-next-app` +
shadcn usa. Funcional, mas "sem sotaque". Eu **reescrevi os valores** dessas
duas paletas dentro de `tailwind.config.js`:

```js
zinc: {
  900: "hsl(160, 14%, 9%)",   // antes era só cinza puro
  950: "hsl(162, 18%, 6%)",
  // ...
},
emerald: {
  500: "#1BAF80",  // antes era #10b981 (o emerald "de fábrica")
  // ...
},
```

Repara que eu uso `hsl(matiz, saturação%, luminosidade%)` em vez de hex pra
maioria dos cinzas — é mais fácil de "sentir" o que está acontecendo: eu
travei o matiz (`hue`) em ~150-160 (que é a faixa do verde) com saturação
bem baixa (8-18%), então o cinza deixa de ser cinza-neutro e vira um
cinza-esverdeado bem sutil, quase imperceptível sozinho, mas que faz o app
inteiro parecer "pensado" em vez de "modelo padrão". E como **toda classe
`zinc-800`, `zinc-900` etc. que já existia em todos os arquivos continua
funcionando igual**, essa troca melhora o app inteiro sem eu precisar
editar arquivo por arquivo.

Também criei uma paleta nova do zero, `ai` (roxo), que não existia antes.
Ela é usada só no card de "Insight da IA" no Dashboard
(`src/app/dashboard/page.tsx`). A ideia por trás: seu app mistura dois
tipos de informação — **dado bruto** (o que você realmente gastou, cor
verde/vermelho) e **opinião gerada por IA** (uma previsão, uma sugestão,
cor roxa). Separar essas cores ajuda a pessoa a distinguir "isso é fato" de
"isso é a IA especulando" só de bater o olho — sem precisar ler o texto.

---

## 6. Tipografia: por que agora tem duas fontes

Antes, o `globals.css` tinha isso:

```css
font-family: Arial, Helvetica, sans-serif;
```

Ou seja: **nenhuma fonte customizada de verdade** — o app usava a fonte
padrão do sistema operacional de cada pessoa (que varia: Windows, Mac,
Android, tudo mostra algo diferente). Eu troquei isso por duas fontes
carregadas via `next/font/google` no `src/app/layout.tsx`:

```tsx
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

- **Manrope** — a fonte de interface (títulos, textos, botões, labels).
- **JetBrains Mono** — só pra **números financeiros** (saldo, valor de
  transação, % de meta). Toda fonte "monoespaçada" tem uma vantagem
  específica pra dinheiro: cada dígito ocupa exatamente a mesma largura, o
  que evita aquele "pulo" visual quando um valor muda de R$ 9,00 pra
  R$ 10,00 (repara como o "1" a mais não empurra o resto do texto de forma
  estranha). Eu criei uma classe utilitária pra isso no `globals.css`:

  ```css
  .font-figures {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  ```

  E apliquei ela em todo lugar que mostra dinheiro: cards do Dashboard,
  lista de transações, cards de meta, os inputs de valor dos modais.

**Por que `next/font/google` e não simplesmente um `<link>` no HTML** (o
jeito mais antigo de importar fonte do Google Fonts)? Porque o
`next/font` baixa a fonte **durante o build** e serve ela junto com o
resto do seu site, em vez do navegador da pessoa ter que sair buscando lá
no servidor do Google toda vez que ela abre seu app. Isso deixa o
carregamento mais rápido e evita aquele "pisca" de fonte trocando (você já
deve ter visto sites onde o texto aparece feio por um instante e depois
"salta" pra fonte bonita — isso é chamado de FOUT, e o `next/font` existe
basicamente pra resolver isso).

> Nota técnica: aqui no ambiente onde eu fiz as mudanças eu não consigo
> rodar `npm run build` até o fim, porque essa etapa de baixar a fonte do
> Google precisa de internet e esse ambiente é isolado. Rodei o
> verificador de tipos (`tsc`) e o linter (`eslint`) nos arquivos que mudei
> e os dois passaram sem erro — então o código está correto, só falta você
> rodar `npm run dev` ou `npm run build` na sua máquina (com internet) pra
> baixar a fonte de verdade.

---

## 7. As correções de mobile, uma por uma

### 7.1. Botões que só apareciam passando o mouse

Esse era o bug mais sério. Repara nesse padrão, que existia em
`TransactionList.tsx`, `GoalCard.tsx` e na tabela de `transactions/page.tsx`:

```tsx
className="opacity-0 group-hover:opacity-100"
```

Traduzindo: "fique invisível (`opacity-0`), e só fique visível
(`opacity-100`) quando o *mouse* passar por cima do elemento pai
(`group-hover`)". Isso é um clássico de quem projeta pensando só em
desktop: **celular não tem mouse**. Não existe "passar o mouse por cima"
no toque — então esses botões de editar/excluir literalmente nunca
apareciam pra quem usava o app no celular. A pessoa via a transação, mas
não tinha como editar nem excluir.

O conserto: usar o prefixo `md:` do Tailwind, que só aplica a classe a
partir da tela "media" (768px) pra cima:

```tsx
className="md:opacity-0 md:group-hover:opacity-100"
```

Sem o `md:` na frente, `opacity-0` valeria sempre. Com ele, o
comportamento "escondido até passar o mouse" só existe em telas grandes
(onde faz sentido, porque tem mouse); no celular, o botão já nasce visível.

### 7.2. Modal sem limite de altura

Os modais (`NewTransactionModal`, `NewGoalModal`, `AddValueModal`, e o
`Dialog` genérico em `components/ui/dialog.tsx`) não tinham `max-height`
nem `overflow-y`. Numa tela de computador isso quase nunca é problema
(tem espaço de sobra). No celular, com o teclado virtual ocupando metade
da tela, um formulário com vários campos podia simplesmente **não caber**,
sem nenhuma barra de rolagem pra compensar — os últimos campos e o botão
de salvar ficavam inacessíveis.

Conserto:

```tsx
className="max-h-[90dvh] overflow-y-auto"
```

`dvh` é "dynamic viewport height" — parecido com `vh` (100vh = altura
total da tela), mas o `d` de "dynamic" faz ele se ajustar quando a barra
de endereço do navegador mobile aparece/some (o `vh` normal não faz isso
direito em navegador de celular, é um bug antigo e chato do CSS).

Além disso, no celular os três modais agora "nascem" grudados embaixo da
tela (viram uma "bottom sheet", tipo o menu que sobe quando você compartilha
algo no Instagram) em vez de flutuar centralizados:

```tsx
className="flex items-end justify-center sm:items-center"
```

`items-end` gruda embaixo por padrão; `sm:items-center` volta a centralizar
a partir de telas médias (tablet/desktop). É mais fácil de alcançar com o
polegar numa tela grande de celular do que um quadrado flutuando no meio.

### 7.3. `env(safe-area-inset-*)` — a "borda de segurança" do iPhone

iPhones modernos têm o notch/Dynamic Island em cima e a barrinha de home
embaixo. Se você posiciona algo `fixed` (o botão de menu, o botão flutuante
"+") sem se preocupar com isso, ele pode ficar meio grudado ou cortado por
trás dessas áreas. O CSS tem uma variável de sistema pronta pra isso:

```tsx
style={{ marginBottom: "env(safe-area-inset-bottom)" }}
```

Em qualquer celular sem notch, isso vale `0px` e não muda nada. Em quem
tem, o navegador preenche esse valor automaticamente com o tamanho exato
da área a evitar. Usei isso no botão hambúrguer (topo), no botão flutuante
"+" (base/direita) e no rodapé da barra lateral.

### 7.4. Tabela de transações virando lista de cartões no celular

Uma tabela HTML (`<table>`) com várias colunas (Descrição, Valor,
Categoria, Data, Ações) não cabe numa tela de 360px de largura. O jeito
"preguiçoso" de resolver isso é jogar a tabela inteira dentro de uma `div`
com `overflow-x-auto` e deixar a pessoa arrastar pro lado — o que já
existia no projeto, e não é errado, mas é uma UX ruim: muita gente nem
percebe que dá pra arrastar, e fica achando que "sumiu" alguma informação.

Troquei por duas versões lado a lado, mostrando uma ou outra pelo tamanho
de tela:

```tsx
<div className="sm:hidden">   {/* lista de cartões, só no celular */}
<div className="hidden sm:block">   {/* a tabela original, do tablet pra cima */}
```

Cada cartão mostra a mesma informação da linha da tabela, só que empilhada
verticalmente — sem precisar de scroll horizontal nenhum.

### 7.5. Área de toque pequena demais

Vários botões de ícone (editar, excluir, fechar modal) tinham só o
tamanho do ícone (16-20px), sem padding. A Apple e o Google recomendam
área mínima de toque de ~44×44px — ícone menor que isso é fácil de errar o
toque, principalmente pra quem tem dedo maior ou pouca precisão motora. Eu
envolvi esses ícones num `flex h-8 w-8/h-9 w-9 items-center justify-center`
(ou aumentei o padding), então a área clicável ficou maior que o ícone
visível, sem precisar desenhar o ícone maior.

### 7.6. Cabeçalhos que apertavam no celular

Em `planning/page.tsx`, o título "Planejamento" e o botão "Nova Meta"
estavam num `flex justify-between` sem nenhuma instrução pro que fazer
quando a tela é estreita — então os dois espremiam lado a lado. Troquei
por:

```tsx
className="flex flex-col sm:flex-row sm:justify-between sm:items-center"
```

`flex-col` empilha os dois verticalmente por padrão (celular); `sm:flex-row`
volta a colocar lado a lado a partir de telas médias. Esse padrão
(`flex-col` no mobile, `sm:flex-row` pra cima) já existia em outras
páginas do seu projeto — eu só apliquei o mesmo padrão onde estava
faltando.

---

## 8. Glossário rápido (termos que apareceram acima)

- **Breakpoint** — um "ponto de corte" de largura de tela onde o layout
  muda. No Tailwind: `sm` (≥640px), `md` (≥768px), `lg` (≥1024px). Uma
  classe sem prefixo vale pra qualquer tamanho; `md:algo` só vale a partir
  de 768px.
- **Hook** — uma função React que começa com `use` (`useState`,
  `useEffect`, `useAuth`...) e te dá acesso a alguma capacidade especial
  do React (memória, efeitos colaterais, contexto).
- **Prop** — um "parâmetro" que você passa de um componente pai pro filho,
  tipo argumento de função: `<GoalCard goal={meuObjetivo} />`.
- **Tabular nums** — variante de uma fonte onde todo dígito (0-9) tem
  exatamente a mesma largura, pra números não "dançarem" ao lado uns dos
  outros.
- **Safe area** — a região da tela que fica livre de notch/câmera/barra de
  gestos, calculada automaticamente pelo navegador via `env(safe-area-inset-*)`.
- **`dvh` vs `vh`** — `vh` é 1% da altura da janela do navegador; em
  celular, isso se confunde quando a barra de endereço aparece/some. `dvh`
  ("dynamic viewport height") se ajusta certo a essa mudança.

---

## 9. Se quiser continuar estudando sozinho

Um exercício bom pra fixar: escolhe UM componente pequeno (tipo o
`Badge.tsx` em `components/ui/`) e tenta explicar pra você mesmo, linha por
linha, o que cada `className` está fazendo. Depois sobe um degrau: escolhe
uma tela inteira (`planning/page.tsx` é um bom tamanho) e tenta desenhar
num papel a árvore de componentes que ela monta (quem chama quem). Isso
treina o olho pra ler React/Tailwind rápido, que é a parte que mais
demora a "destravar" no começo.
