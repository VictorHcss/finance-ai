# Guia da rodada de polimento (Sidebar, Landing Page, meta editável)

Esse documento é a continuação do `docs/GUIA-DE-ESTUDO.md` — lá está o
panorama geral do projeto; aqui está o "diário de bordo" bem explicado de
uma rodada específica de mudanças, pra você conseguir olhar o código depois
e lembrar o raciocínio, não só o resultado. Numerado como continuação das
seções do outro guia, mas dá pra ler sem ele.

---

## 1. O botão do Sidebar no mobile: de "fixed" pra "dentro do fluxo"

### O sintoma
O botão de abrir o menu no celular ficava visualmente torto/desalinhado em
relação ao título da página no header.

### A causa raiz (e por que não era só "adicionar uma margem")
Antes, o botão vivia dentro do `Sidebar.tsx`, mas era renderizado como
`position: fixed`, num canto da tela, **fora** do header:

```tsx
<button
  style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
  className="fixed left-4 ... h-11 w-11 ..."
>
```

Ou seja: o topo do botão era um número calculado na mão (`1rem` + a borda
de segurança do celular). Enquanto isso, o título da página, no
`Navbar.tsx`, é centralizado de um jeito completamente diferente — com
`flex items-center` dentro de um header de altura `h-14` (56px no celular)
ou `h-16` (64px a partir de "md"):

```tsx
<header className="h-14 md:h-16 ... flex items-center ...">
```

Dois sistemas de posicionamento independentes, sem nenhuma relação
matemática real entre si. Fazendo a conta: com header de 56px e sem
notch, o título fica centralizado em ~28px a partir do topo do header; o
botão `fixed` com `top: 16px` e altura de 44px tinha o centro em ~38px.
Uns 10px de diferença — pequeno o bastante pra passar despercebido numa
primeira olhada, grande o bastante pra o olho notar que "tá torto". E o
"desvio" mudava de tamanho dependendo do celular (por causa da
`safe-area-inset-top`, que varia por aparelho) e do breakpoint (o header
muda de 56px pra 64px em telas médias) — por isso "colocar uma margem" só
ia resolver num caso específico e voltar a quebrar no próximo.

### O conserto estrutural
Em vez de tentar *recalcular* o número certo, tirei o botão do
`position: fixed` e coloquei ele **dentro do próprio header**, como mais um
item do mesmo `flex` row do título:

```tsx
// Navbar.tsx
<div className="flex items-center gap-3 md:gap-4 min-w-0">
  <button onClick={openMenu} className="... lg:hidden">
    <Menu size={20} />
  </button>
  <div className="min-w-0">
    <h1>{page.title}</h1>
    ...
```

Como os dois (botão e título) agora são irmãos dentro do mesmo container
com `items-center`, o alinhamento vertical vem de graça do próprio
flexbox — não existe mais nenhum número mágico pra manter sincronizado.
Isso é o que "resolver a causa, não o sintoma" quer dizer na prática: a
correção não foi *ajustar* o cálculo, foi *eliminar* a necessidade dele.

### O problema que isso trouxe: dois componentes, um estado só
Só que o botão que abre o menu (`Navbar.tsx`) e o menu que abre/fecha
(`Sidebar.tsx`) são dois componentes **irmãos** dentro de `AppLayout.tsx`
— nenhum é filho do outro:

```tsx
// AppLayout.tsx
<Sidebar />
<div>
  <Navbar />
  ...
```

Antes, o `isOpen` do menu era um `useState` que morava só dentro do
`Sidebar`, e o botão que abria ele também morava dentro do `Sidebar` — sem
problema, os dois estavam no mesmo componente. Agora que o botão se mudou
pro `Navbar`, os dois precisam **enxergar o mesmo estado**, mas não tem
como passar isso por prop diretamente (não são pai/filho).

A solução padrão do React pra "dois componentes distantes que precisam
compartilhar um estado" é um **Context** — o mesmo mecanismo que
`AuthContext`, `DataContext` e `ToastContext` já usam nesse projeto. Criei
um novo, `src/contexts/SidebarContext.tsx`:

```tsx
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) throw new Error("useSidebar deve ser usado dentro de um SidebarProvider");
  return context;
}
```

E envolvi o `AppLayout` inteiro com ele:

```tsx
<SidebarProvider>
  <Sidebar />
  <div>
    <Navbar />
    ...
  </div>
</SidebarProvider>
```

Agora `Navbar` chama `useSidebar().open` no `onClick` do botão, e
`Sidebar` chama `useSidebar().isOpen`/`.close` pra saber se deve mostrar o
drawer e pra fechar ao clicar num link. Os dois "conversam" através do
Context sem precisar um saber que o outro existe.

**Padrão pra guardar**: sempre que dois componentes que não são pai/filho
direto precisam compartilhar um pedaço de estado, as opções são (a) subir
o estado pro ancestral comum mais próximo e passar por prop (bom pra casos
simples, poucos níveis), ou (b) um Context (melhor quando são "vizinhos
distantes" ou quando mais de dois componentes vão precisar do mesmo
estado). Aqui, `Navbar` e `Sidebar` só têm `AppLayout` como ancestral
comum e nenhum outro componente precisa desse estado — dava pra ter feito
por prop também (`AppLayout` guarda o `useState` e passa `isOpen`/`onOpen`
pros dois). Escolhi Context porque é o padrão que o resto do projeto já
usa pra esse tipo de coisa, e porque evita "prop drilling" caso amanhã
mais alguma coisa precise saber se o menu tá aberto.

---

## 2. Landing Page: o que já existia vs. o que entrou

Vale registrar isso porque é fácil, lendo só o resultado final, achar que
a Landing Page foi reescrita do zero — não foi. Ela já tinha hero, preview
do produto, "como funciona", funcionalidades, diferenciais (incluindo os
Insights) e FAQ, tudo bem feito. O que entrou nessa rodada:

- **Espaçamento do header** (`gap-2 sm:gap-4` → `gap-4 sm:gap-6` entre
  "Entrar" e "Criar conta") e remoção do rótulo "Grátis" do botão.
- **Seção de Segurança e Privacidade** (`#seguranca`), com conteúdo
  copiado do que já está documentado e validado em `docs/SEGURANCA.md` —
  hash de senha com salt por usuário, sessão obrigatória em toda
  requisição, isolamento entre contas — mais uma frase deixando claro que
  não existe certificação formal nem "criptografia de nível bancário".
  Isso importa: uma landing page de produto financeiro que promete
  segurança que não existe é o tipo de coisa que gera problema sério
  depois (legal e de confiança). Documentar só o que é verdade, e dizer
  isso explicitamente, é mais forte do que qualquer adjetivo.
- **Página `/precos`** nova (`src/app/precos/page.tsx`): plano gratuito
  com tudo que já existe, sem checkout/cobrança fictícios, e uma seção
  "E no futuro?" deixando claro que possíveis planos pagos são uma
  possibilidade em aberto, não um anúncio.

Não criei `/recursos`, `/como-funciona`, `/seguranca` ou `/faq` como
páginas separadas — elas já existem como seções-âncora (`#funcionalidades`,
`#como-funciona`, `#seguranca`, `#faq`) na própria Landing Page.
Transformar isso em páginas separadas seria duplicar conteúdo sem
necessidade real (a própria tarefa original pedia pra evitar isso).

---

## 3. Estado vazio do gráfico do Dashboard (`FinanceChart.tsx`)

### O comportamento antigo
`storage.getChartData()` sempre devolve os últimos 6 meses, mesmo sem
nenhuma transação — só que com `income: 0` e `expense: 0` em cada mês (ver
`computeChartData` em `localStorage.ts`). Isso quer dizer que "sem dados"
**não é um array vazio** — é um array de 6 meses, todos zerados. Uma
pessoa que acabou de criar a conta via uma linha reta em zero, sem
nenhuma pista do que fazer a seguir.

### A distinção que o código precisa fazer
```tsx
const hasData = data.some((point) => point.income !== 0 || point.expense !== 0);
```

Repara que isso é bem diferente de checar `data.length === 0` — o array
quase nunca está vazio nesse componente, o que muda é se os *valores*
dentro dele são todos zero. Esse é um erro comum: assumir que "sem dados"
sempre significa "lista vazia", quando às vezes os dados vêm pré-preenchidos
com valores neutros (aqui, zero) por causa de como a função que os gera
foi escrita (ela sempre cria os 6 "baldes" de mês antes de somar as
transações em cima).

### A solução
Quando `hasData` é falso, em vez do `<AreaChart>`, mostra uma mensagem com
botão "Adicionar transação". Esse botão não pode simplesmente chamar
`setIsOpen(true)` de dentro do `FinanceChart`, porque o modal de nova
transação (`NewTransactionModal`) é outro componente, sem relação de
pai/filho com o gráfico — o mesmo problema do botão do Sidebar (seção 1),
só que dessa vez resolvido de um jeito mais simples, porque já existia um
precedente no próprio projeto: eventos customizados do `window`.

```tsx
function openNewTransaction() {
  window.dispatchEvent(new Event("open-transaction-modal-new"));
}
```

E dentro de `NewTransactionModal.tsx`, um novo listener:

```tsx
useEffect(() => {
  function handleOpenForNew() { openForNew(); }
  window.addEventListener("open-transaction-modal-new", handleOpenForNew);
  return () => window.removeEventListener("open-transaction-modal-new", handleOpenForNew);
}, []);
```

Isso já era o padrão do projeto pra "editar transação a partir de outra
tela" (evento `open-transaction-modal`, que carrega a transação a editar
no `detail`) — só reaproveitei a mesma ideia pra "criar", sem `detail`
nenhum porque criar não precisa de dado nenhum pra começar.

**Por que evento customizado e não Context aqui?** Dá pra fazer dos dois
jeitos. A diferença prática: Context é melhor quando o estado precisa ser
*lido* em vários lugares ao mesmo tempo (tipo "o menu tá aberto?", que o
`Sidebar` precisa checar toda hora pra saber o que renderizar). Evento é
mais simples quando é só um "avise alguém que isso aconteceu, uma vez",
sem ninguém precisando ficar checando um valor continuamente — é
basicamente um "toque no ombro" de um componente pro outro. Como o
`NewTransactionModal` só precisa *reagir* ao clique (abrir), não ficar
*observando* um estado o tempo todo, evento resolve com menos código.

---

## 4. Editar meta — a funcionalidade ponta a ponta

Essa é a mais "grande" das mudanças dessa rodada, e serve bem pra estudar
como uma feature atravessa **as quatro camadas** do backend (rota →
serviço → repositório → banco) e depois as **duas camadas** do frontend
(a tela → `storage.ts`, que decide se fala com a API ou com o
localStorage).

### 4.1. Por que essa e não outra ideia do `docs/IDEIAS.md`

Antes de escrever qualquer código, conferi cada ideia "rápida" contra o
estado real do código (não só contra a lista) — e a maioria já estava
feita ou não se aplicava mais:

- "Confirmar exclusão de meta com o valor visível" → **já implementado**
  (`GoalCard.tsx` já mostra o valor no `confirm()`).
- "Skeleton no card de Perfil em Configurações" → **não se aplica mais**:
  o `ProtectedRoute` só renderiza a página depois que `session` (e,
  junto, `user`) já existem — então nunca existe o intervalo em que a
  tela mostraria o card de Perfil sem dado nenhum.
- "Estado vazio no gráfico" → já resolvido na rodada anterior (seção 3
  deste guia).

Sobrou "Editar meta" como a única ideia da lista de esforço médio que
continuava genuinamente faltando e trazia valor real (hoje, pra corrigir
o nome ou o prazo de uma meta, a única opção era excluir e recriar do
zero — perdendo o valor já guardado).

### 4.2. Backend — schema

```python
# app/schemas/finance.py
class GoalUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    target_amount: float = Field(gt=0)
    deadline: Optional[str] = Field(default=None, max_length=40)
```

Reparem que **não existe `current_amount` aqui** — de propósito. O valor
já guardado numa meta só pode mudar por depósito (`/deposit`) ou conclusão
(`/complete`); editar é só nome/alvo/prazo. Se `GoalUpdate` também
aceitasse `current_amount`, existiriam dois caminhos diferentes pra
alterar o mesmo dado, o que é uma receita clássica pra bug ("por que esse
valor mudou? quem mexeu?" vira uma pergunta com duas respostas possíveis
em vez de uma).

### 4.3. Backend — repositório (a camada que fala SQL)

```python
def update_goal(self, user_id, goal_id, name, target_amount, deadline, completed) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "UPDATE goals SET name = ?, target_amount = ?, deadline = ?, completed = ?, updated_at = ? "
            "WHERE id = ? AND user_id = ?",
            (name, target_amount, deadline, int(completed), now, goal_id, user_id),
        )
        conn.commit()
    return cursor.rowcount
```

O `WHERE id = ? AND user_id = ?` é a parte que garante o isolamento entre
contas — o mesmo padrão usado em todo o resto do repositório (`delete_goal`,
`update_transaction`, etc.). Se o `goal_id` pertence a outro usuário, o
`UPDATE` não encontra nenhuma linha pra atualizar, e `cursor.rowcount`
volta `0` — é esse `0` que o serviço, na camada de cima, transforma num
404 "meta não encontrada" (em vez de, por exemplo, um 403 "acesso
negado" — a escolha de dar 404 em vez de 403 é proposital: 403 confirmaria
pra quem está tentando que aquele `goal_id` existe, só que não é dele; 404
não vaza essa informação).

### 4.4. Backend — serviço (a camada de regra de negócio)

```python
def update_goal(self, user_id: int, goal_id: int, payload: dict) -> dict:
    goal = self.repository.get_goal(user_id, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    current_amount = float(goal["current_amount"])
    completed = current_amount >= payload["target_amount"]
    updated_rows = self.repository.update_goal(
        user_id, goal_id, payload["name"], payload["target_amount"], payload.get("deadline"), completed,
    )
    if not updated_rows:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    return {"status": "success", "message": "Meta atualizada"}
```

O detalhe mais sutil de toda essa feature está nessa linha:

```python
completed = current_amount >= payload["target_amount"]
```

Pensa nesse cenário: uma meta tem alvo de R$ 1.000 e já tem R$ 800
guardados (não concluída, faltam R$ 200). A pessoa edita o alvo pra R$
500 (talvez porque descobriu que precisa de menos do que pensava). Sem
recalcular `completed`, a meta continuaria marcada como "não concluída",
mesmo já tendo mais dinheiro guardado do que o novo alvo pede — uma
inconsistência visível pra quem usa o app (a barra mostraria mais de
100%, "faltam R$ 0,00", mas sem o selo de "Concluída"). Recalculando a
cada edição, o sistema nunca fica com esse tipo de dado contraditório.
Reparem que essa é a *mesma* lógica que `deposit_goal` já usa
(`completed = new_amount >= target_amount`) — reaproveitar a mesma regra
em vez de inventar uma nova é o que garante que os dois caminhos (editar
alvo, depositar valor) cheguem sempre à mesma conclusão sobre o que
"concluída" significa.

### 4.5. Backend — rota (a camada HTTP)

```python
@router.put("/{goal_id}")
def update_goal(goal_id: int, goal: GoalUpdate, user_id: int = Depends(get_current_user_id)) -> dict:
    return service.update_goal(user_id, goal_id, goal.model_dump())
```

Por que `PUT` e não `PATCH`? Convenção HTTP: `PUT` substitui o recurso
inteiro (aqui, "inteiro" dentro do que é editável — nome, alvo, prazo);
`PATCH` seria pra atualizar só *um* campo por vez. Como o formulário do
frontend sempre manda os três campos juntos (é um único formulário, sem
edição campo-a-campo), `PUT` é a escolha mais correta — é o mesmo padrão
que `update_transaction` já usa nesse projeto (`PUT /api/transactions/{id}`).

### 4.6. Frontend — as duas implementações que precisam concordar

Esse projeto tem um "truque" central, já explicado na seção 4 do
`docs/GUIA-DE-ESTUDO.md`: `storage.ts` decide, chamada por chamada, se
fala com a API (backend real) ou com o `localStorage` (modo offline) — e
quem chama `storage.updateGoal(...)` não sabe nem precisa saber qual dos
dois está rodando por baixo. Isso só funciona se as duas implementações
**se comportarem igual**. Por isso, o `updateGoal` do `localStorage.ts`
replica a mesma regra do backend:

```tsx
async updateGoal(id, data) {
  const list = loadGoals(userId);
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) throw new Error("Meta não encontrada");

  const current = list[idx].current ?? 0;
  const target = Number(data.target_amount) || 0;
  const updated = computeGoalDerived({
    ...list[idx],
    goal_name: data.name,
    target,
    deadline: data.deadline ?? undefined,
    completed: current >= target,   // <- a mesma regra da seção 4.4
  });
  list[idx] = updated;
  saveGoals(userId, list);
  return updated;
}
```

Uma armadilha que valeu a pena registrar aqui: a função `computeGoalDerived`
já existente no projeto tem essa linha:

```tsx
completed: goal.completed ?? percent >= 100,
```

O `??` (nullish coalescing) só usa o valor da direita quando o da esquerda
é `null`/`undefined` — **não** quando é `false`. Ou seja: se eu tivesse
passado `completed: list[idx].completed` (o valor antigo, que pode ser
`false`) pra dentro de `computeGoalDerived`, ele teria mantido esse
`false` mesmo que o novo alvo tornasse a meta "completa" — porque `false`
não é `undefined`, o `??` não pega esse caso. Por isso o código calcula
`completed` **explicitamente antes** de chamar `computeGoalDerived`, em
vez de deixar a função "adivinhar". É um lembrete útil sobre `??`: ele só
cobre "não informado", não cobre "informado como falso/zero/vazio" — se
sua intenção é "recalcule sempre", ela nunca deve depender de `??`.

### 4.7. Frontend — reaproveitando o modal em vez de criar um novo

`NewGoalModal.tsx` já existia só pra criar. Em vez de criar um
`EditGoalModal.tsx` separado (que duplicaria quase 100% do formulário),
ele ganhou um modo de edição, do mesmo jeito que o `FinanceChart` (seção
3) e o `NewTransactionModal` já resolvem esse tipo de problema — um evento
customizado:

```tsx
useEffect(() => {
  function handleOpenForEdit(e: Event) {
    const goal = (e as CustomEvent<Goal>).detail;
    setEditingId(goal.id);
    setName(goal.goal_name);
    setTarget(String(goal.target));
    setDeadline(goal.deadline ? goal.deadline.slice(0, 10) : "");
    setIsOpen(true);
  }
  window.addEventListener("open-goal-modal-edit", handleOpenForEdit);
  return () => window.removeEventListener("open-goal-modal-edit", handleOpenForEdit);
}, []);
```

E no `GoalCard.tsx`, o botão novo de lápis só dispara esse evento com a
meta atual:

```tsx
function handleEdit() {
  window.dispatchEvent(new CustomEvent("open-goal-modal-edit", { detail: goal }));
}
```

Dentro do `handleSave` do modal, um `if (editingId !== null)` decide se
chama `storage.updateGoal(...)` ou `storage.createGoal(...)` — o resto do
formulário (os `<input>`, a validação, o botão de salvar) é o mesmo pros
dois casos, só o texto muda ("Criar Meta" vira "Salvar alterações",
"Definir Nova Meta" vira "Editar Meta").

### 4.8. Os testes que cobrem isso

Em `backend/tests/test_finance_security.py`, entraram 5 testes novos,
cada um cobrindo uma pergunta específica que qualquer código de edição
precisa responder:

1. **`test_usuario_nao_edita_meta_de_outro`** — Isolamento: dá pra editar
   a meta de outra pessoa? (não).
2. **`test_editar_meta_inexistente_retorna_404`** — E se o `goal_id` nem
   existir?
3. **`test_editar_meta_atualiza_nome_alvo_e_prazo_sem_alterar_valor_guardado`**
   — O caminho feliz: edita e confere que os três campos mudaram e que
   `current` **não** mudou (a garantia mais importante da seção 4.2).
4. **`test_editar_meta_com_alvo_abaixo_do_valor_guardado_marca_como_concluida`**
   — O caso de borda da seção 4.4: baixar o alvo abaixo do que já foi
   guardado marca a meta como concluída automaticamente.
5. **`test_editar_meta_com_nome_curto_e_rejeitado`** — Validação: o
   Pydantic recusa um nome de 1 caractere (422).

Esses 5 testes seguem exatamente a mesma estrutura dos testes que já
existiam pra depósito/conclusão/exclusão de meta — usar o mesmo "molde"
(criar meta com `create_goal(client, headers, **overrides)`, pegar o `id`
pelo `GET /status`, chamar a rota, conferir o status code e o estado
final) é o que torna esse arquivo de teste fácil de continuar escrevendo
no futuro: quem for adicionar o próximo teste só precisa copiar o padrão.

**Por que não tem teste de frontend?** Esse projeto não tem nenhum
framework de teste de frontend configurado (sem Jest, sem Vitest, sem
Testing Library) — então nenhuma tela tem teste automatizado, isso não é
uma lacuna exclusiva dessa feature. A garantia de qualidade do frontend
hoje vem de `tsc --noEmit` (tipos batem) + `eslint` (sem erros/avisos) +
o fato de toda lógica de negócio real (cálculo de `completed`, de
`percent`, de `missing`) morar em funções puras (`computeGoalDerived`) que
*poderiam* ganhar teste unitário facilmente se um framework fosse
adicionado no futuro — é uma ideia de próximo passo, não algo que eu
adicionei agora (adicionar um framework de teste novo é uma mudança de
ferramentas/arquitetura que merece ser decidida à parte, não "de
carona" numa feature).

---

## 5. Resumo rápido de onde mexer, se quiser continuar sozinho

| Quero... | Olho em |
|---|---|
| Mudar o que aparece no header (título, ações) | `src/components/Navbar.tsx` |
| Mudar itens do menu lateral | `src/components/Sidebar.tsx` |
| Adicionar um novo "estado compartilhado" tipo o do menu | `src/contexts/` (copiar o padrão de `SidebarContext.tsx`) |
| Mudar o texto/seções da Landing Page | `src/app/page.tsx` |
| Mudar a página de preços | `src/app/precos/page.tsx` |
| Mudar a regra de quando uma meta conta como "concluída" | `backend/app/services/finance_service.py` (e replicar em `src/lib/localStorage.ts`, função `computeGoalDerived`/`updateGoal`) |
| Adicionar um novo endpoint de meta | `backend/app/routers/goals.py` → `finance_service.py` → `finance_repository.py`, nessa ordem |
| Testar uma regra nova do backend | `backend/tests/test_finance_security.py`, copiando o formato dos testes de meta já existentes |
