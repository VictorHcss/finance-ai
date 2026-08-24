import type {
  Transaction,
  Goal,
  InsightData,
  DashboardSummary,
  ChartDataPoint,
  UserProfile,
  AuthSession,
} from "./api";
import {
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  type Notification,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type MarkAllNotificationsAsReadRequest,
  type MarkNotificationAsReadResponse,
  type MarkAllNotificationsAsReadResponse,
} from "@/features/notifications/types";

const LS_KEY_PREFIX = "financeai";
const LS_KEY_USERS = `${LS_KEY_PREFIX}.users`;
const LS_KEY_CURRENT_LOCAL_USER_ID = `${LS_KEY_PREFIX}.currentLocalUserId`;

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

type LocalUserRecord = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

type LocalNotificationsService = {
  list: (params: ListNotificationsRequest) => Promise<ListNotificationsResponse>;
  markAsRead: (id: number) => Promise<MarkNotificationAsReadResponse>;
  markAllAsRead: (
    params: MarkAllNotificationsAsReadRequest,
  ) => Promise<MarkAllNotificationsAsReadResponse>;
};

function getLs(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function userKey(userId: number, suffix: string): string {
  return `${LS_KEY_PREFIX}.user.${userId}.${suffix}`;
}

function readLs<T>(key: string, fallback: T): T {
  const ls = getLs();
  if (!ls) return fallback;
  try {
    const raw = ls.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLs<T>(key: string, value: T): void {
  const ls = getLs();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nextId(list: { id?: number }[]): number {
  const max = list.reduce((m, item) => Math.max(m, item.id ?? 0), 0);
  return max + 1;
}

function getCurrentLocalUserId(): number | null {
  return readLs<number | null>(LS_KEY_CURRENT_LOCAL_USER_ID, null);
}

function setCurrentLocalUserId(id: number | null): void {
  if (id === null) {
    const ls = getLs();
    if (ls) ls.removeItem(LS_KEY_CURRENT_LOCAL_USER_ID);
  } else {
    writeLs(LS_KEY_CURRENT_LOCAL_USER_ID, id);
  }
}

function requireCurrentUserId(): number {
  const id = getCurrentLocalUserId();
  if (id === null) throw new Error("Nenhum usuário local logado");
  return id;
}

function computeGoalDerived(
  goal: Omit<Goal, "missing" | "percent"> & { missing?: number; percent?: number },
): Goal {
  const current = goal.current ?? 0;
  const target = Math.max(goal.target, 0.01);
  const percent = Math.min(100, (current / target) * 100);
  const missing = Math.max(0, target - current);
  return {
    ...goal,
    current,
    missing,
    percent: Math.round(percent * 100) / 100,
    completed: goal.completed ?? percent >= 100,
  } as Goal;
}

function sortTransactionsByDateDesc(txs: Transaction[]): Transaction[] {
  return [...txs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function buildUserTransactionsKey(userId: number): string {
  return userKey(userId, "transactions");
}
function buildUserGoalsKey(userId: number): string {
  return userKey(userId, "goals");
}
function buildUserNotificationsKey(userId: number): string {
  return userKey(userId, "notifications");
}

function loadTransactions(userId: number): Transaction[] {
  return readLs<Transaction[]>(buildUserTransactionsKey(userId), []);
}

function saveTransactions(userId: number, list: Transaction[]): void {
  writeLs(buildUserTransactionsKey(userId), list);
}

function loadGoals(userId: number): Goal[] {
  const raw = readLs<Array<Partial<Goal>>>(buildUserGoalsKey(userId), []);
  return raw.map((g) => computeGoalDerived(g as Omit<Goal, "missing" | "percent">));
}

function saveGoals(userId: number, list: Goal[]): void {
  writeLs(buildUserGoalsKey(userId), list);
}

function loadNotifications(userId: number): Notification[] {
  return readLs<Notification[]>(buildUserNotificationsKey(userId), []);
}

function saveNotifications(userId: number, list: Notification[]): void {
  writeLs(buildUserNotificationsKey(userId), list);
}

function computeDashboardSummary(txs: Transaction[]): DashboardSummary {
  const incomes = txs
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + (t.amount ?? 0), 0);
  const expenses = txs
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + (t.amount ?? 0), 0);
  const total = incomes - expenses;
  const totalRef = Math.max(incomes, 1);
  const expense_ratio = Math.round((expenses / totalRef) * 10000) / 100;
  return {
    incomes,
    expenses,
    total,
    balance_trend_percentage: 0,
    expense_ratio,
  };
}

function computeChartData(txs: Transaction[]): ChartDataPoint[] {
  const byMonth = new Map<string, { name: string; income: number; expense: number }>();

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, {
      name: MONTH_NAMES[d.getMonth()],
      income: 0,
      expense: 0,
    });
  }

  for (const tx of txs) {
    const d = new Date(tx.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    if (tx.type === "income") bucket.income += tx.amount ?? 0;
    else bucket.expense += tx.amount ?? 0;
  }

  return Array.from(byMonth.values());
}

function computeInsights(txs: Transaction[]): InsightData | null {
  const expenses = txs.filter((t) => t.type === "expense");
  if (expenses.length === 0) return null;

  const byMonthMap = new Map<string, number>();
  const sortedTxs = [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  for (const tx of sortedTxs) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonthMap.set(key, (byMonthMap.get(key) ?? 0) + (tx.amount ?? 0));
  }

  const historico: { mes: string; valor: number }[] = Array.from(
    byMonthMap.entries(),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, valor]) => {
      const [y, m] = key.split("-");
      const monthIndex = parseInt(m, 10) - 1;
      return {
        mes: `${MONTH_NAMES[monthIndex]}/${y.slice(2)}`,
        valor: Math.round(valor * 100) / 100,
      };
    })
    .slice(-6);

  if (historico.length === 0) return null;

  const values = historico.map((h) => h.valor);
  const media_gastos = Math.round(
    (values.reduce((a, b) => a + b, 0) / values.length) * 100,
  ) / 100;

  let variacao_percentual = 0;
  if (values.length >= 2) {
    const prev = values[values.length - 2] || 1;
    const curr = values[values.length - 1];
    variacao_percentual = Math.round(((curr - prev) / prev) * 10000) / 100;
  }

  const previsao_proximo_mes = Math.round(media_gastos * (1 + variacao_percentual / 100) * 100) / 100;
  const economias_sugeridas = Math.round(media_gastos * 0.1 * 100) / 100;

  let alerta: string;
  if (variacao_percentual > 15) {
    alerta = `Atenção: seus gastos aumentaram ${variacao_percentual.toFixed(1)}% em relação ao mês anterior. Considere revisar despesas variáveis.`;
  } else if (variacao_percentual < -10) {
    alerta = `Ótima notícia! Seus gastos caíram ${Math.abs(variacao_percentual).toFixed(1)}%. Considere direcionar a economia para suas metas.`;
  } else {
    alerta = `Seus gastos estão estáveis (${variacao_percentual.toFixed(1)}% de variação). Continue acompanhando para manter o equilíbrio financeiro.`;
  }

  return {
    alerta,
    previsao_proximo_mes,
    economias_sugeridas,
    media_gastos,
    variacao_percentual,
    historico,
  };
}

function ensureDemoNotifications(userId: number): void {
  const existing = loadNotifications(userId);
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const demo: Notification[] = [
    {
      id: 1,
      title: "Bem-vindo ao Finance AI",
      description: "Modo local ativado — seus dados serão salvos neste navegador.",
      category: NotificationCategory.Sistema,
      priority: NotificationPriority.Normal,
      status: NotificationStatus.Unread,
      created_at: now,
      action_url: "/transactions",
    },
    {
      id: 2,
      title: "Dica: adicione sua primeira transação",
      description: "Toque no botão + para registrar receitas e despesas.",
      category: NotificationCategory.Lembretes,
      priority: NotificationPriority.Low,
      status: NotificationStatus.Unread,
      created_at: now,
    },
  ];
  saveNotifications(userId, demo);
}

const localStorageBackend = {
  // --- Auth ---
  async login(data: { email: string; password: string }): Promise<AuthSession> {
    const users = readLs<LocalUserRecord[]>(LS_KEY_USERS, []);
    const user = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (!user) throw new Error("Credenciais inválidas");

    const hashed = await sha256(`${data.password}${user.passwordSalt}`);
    if (hashed !== user.passwordHash) throw new Error("Credenciais inválidas");

    setCurrentLocalUserId(user.id);

    const profile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    ensureDemoNotifications(user.id);

    return {
      session_token: `local-${user.id}-${Date.now()}`,
      user: profile,
      expires_at: expiresAt.toISOString(),
    };
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthSession> {
    const users = readLs<LocalUserRecord[]>(LS_KEY_USERS, []);
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error("E-mail já cadastrado");
    }

    const salt = generateSalt();
    const passwordHash = await sha256(`${data.password}${salt}`);
    const id = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;

    const record: LocalUserRecord = {
      id,
      name: data.name,
      email: data.email,
      passwordHash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };
    users.push(record);
    writeLs(LS_KEY_USERS, users);

    setCurrentLocalUserId(id);

    const profile: UserProfile = {
      id,
      name: data.name,
      email: data.email,
      created_at: record.createdAt,
    };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    ensureDemoNotifications(id);

    return {
      session_token: `local-${id}-${Date.now()}`,
      user: profile,
      expires_at: expiresAt.toISOString(),
    };
  },

  async logout(sessionToken: string): Promise<void> {
    void sessionToken;
    setCurrentLocalUserId(null);
  },

  async forgotPassword(email: string): Promise<void> {
    const users = readLs<LocalUserRecord[]>(LS_KEY_USERS, []);
    const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      throw new Error("E-mail não encontrado");
    }
    // Modo demo: só retorna sucesso sem enviar e-mail real
    await new Promise((r) => setTimeout(r, 300));
  },

  async getProfile(): Promise<UserProfile> {
    const userId = requireCurrentUserId();
    const users = readLs<LocalUserRecord[]>(LS_KEY_USERS, []);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error("Usuário não encontrado");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    };
  },

  // --- Transactions ---
  async getTransactions(): Promise<Transaction[]> {
    const userId = requireCurrentUserId();
    return sortTransactionsByDateDesc(loadTransactions(userId));
  },

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const userId = requireCurrentUserId();
    const list = loadTransactions(userId);
    const record: Transaction = {
      id: nextId(list),
      description: data.description ?? "Sem descrição",
      amount: Number(data.amount) || 0,
      type: data.type === "expense" ? "expense" : "income",
      category: data.category ?? "Outros",
      date: data.date ?? new Date().toISOString(),
    };
    list.push(record);
    saveTransactions(userId, list);
    return record;
  },

  async updateTransaction(
    id: number,
    data: Partial<Transaction>,
  ): Promise<Transaction> {
    const userId = requireCurrentUserId();
    const list = loadTransactions(userId);
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Transação não encontrada");
    list[idx] = {
      ...list[idx],
      ...data,
      id: list[idx].id,
    } as Transaction;
    saveTransactions(userId, list);
    return list[idx];
  },

  async deleteTransaction(id: number): Promise<void> {
    const userId = requireCurrentUserId();
    const list = loadTransactions(userId).filter((t) => t.id !== id);
    saveTransactions(userId, list);
  },

  // --- Goals ---
  async getGoalsStatus(): Promise<Goal[]> {
    const userId = requireCurrentUserId();
    return loadGoals(userId);
  },

  async createGoal(data: Partial<Goal> & { name?: string; target_amount?: number; current_amount?: number }): Promise<Goal> {
    const userId = requireCurrentUserId();
    const list = loadGoals(userId);
    const goalName = data.goal_name ?? data.name ?? "Nova Meta";
    const target = Number(data.target ?? data.target_amount) || 0;
    const current = Number(data.current ?? data.current_amount) || 0;

    const base: Omit<Goal, "missing" | "percent"> = {
      id: nextId(list),
      goal_name: goalName,
      target,
      current,
      deadline: data.deadline,
      completed: data.completed ?? false,
    };
    const record = computeGoalDerived(base);
    list.push(record);
    saveGoals(userId, list);
    return record;
  },

  async depositGoal(id: number, amount: number): Promise<Goal> {
    const userId = requireCurrentUserId();
    const list = loadGoals(userId);
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error("Meta não encontrada");
    const updated = computeGoalDerived({
      ...list[idx],
      current: (list[idx].current ?? 0) + Number(amount),
    });
    list[idx] = updated;
    saveGoals(userId, list);
    return updated;
  },

  async completeGoal(id: number): Promise<Goal> {
    const userId = requireCurrentUserId();
    const list = loadGoals(userId);
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error("Meta não encontrada");
    const updated = computeGoalDerived({
      ...list[idx],
      completed: true,
      current: list[idx].target,
    });
    list[idx] = updated;
    saveGoals(userId, list);
    return updated;
  },

  async deleteGoal(id: number): Promise<void> {
    const userId = requireCurrentUserId();
    const list = loadGoals(userId).filter((g) => g.id !== id);
    saveGoals(userId, list);
  },

  // --- Dashboard ---
  async getSummary(): Promise<DashboardSummary> {
    const userId = requireCurrentUserId();
    return computeDashboardSummary(loadTransactions(userId));
  },

  async getInsights(): Promise<InsightData | null> {
    const userId = requireCurrentUserId();
    return computeInsights(loadTransactions(userId));
  },

  async getChartData(): Promise<ChartDataPoint[]> {
    const userId = requireCurrentUserId();
    return computeChartData(loadTransactions(userId));
  },

  async resetDatabase(): Promise<void> {
    const userId = getCurrentLocalUserId();
    if (userId !== null) {
      saveTransactions(userId, []);
      saveGoals(userId, []);
      saveNotifications(userId, []);
    }
  },
};

export const localStorageNotificationsService: LocalNotificationsService = {
  async list(params): Promise<ListNotificationsResponse> {
    const userId = requireCurrentUserId();
    let items = loadNotifications(userId);

    if (params.status) {
      items = items.filter((n) => n.status === params.status);
    }
    if (params.category) {
      items = items.filter((n) => n.category === params.category);
    }
    if (params.priority) {
      items = items.filter((n) => n.priority === params.priority);
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.description ?? "").toLowerCase().includes(q),
      );
    }
    if (params.from) {
      const fromTs = new Date(params.from).getTime();
      items = items.filter((n) => new Date(n.created_at).getTime() >= fromTs);
    }
    if (params.to) {
      const toTs = new Date(params.to).getTime();
      items = items.filter((n) => new Date(n.created_at).getTime() <= toTs);
    }

    items = items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const total = items.length;
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.page_size ?? 50;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      items: paged,
      page,
      page_size: pageSize,
      total,
    };
  },

  async markAsRead(id: number): Promise<MarkNotificationAsReadResponse> {
    const userId = requireCurrentUserId();
    const items = loadNotifications(userId).map((n) =>
      n.id === id
        ? { ...n, status: NotificationStatus.Read as const, read_at: n.read_at ?? new Date().toISOString() }
        : n,
    );
    saveNotifications(userId, items);
    return { ok: true };
  },

  async markAllAsRead(
    filters: MarkAllNotificationsAsReadRequest,
  ): Promise<MarkAllNotificationsAsReadResponse> {
    const userId = requireCurrentUserId();
    const now = new Date().toISOString();
    const items = loadNotifications(userId).map((n) => {
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const matches =
          n.title.toLowerCase().includes(q) ||
          (n.description ?? "").toLowerCase().includes(q);
        if (!matches) return n;
      }
      if (filters.category && n.category !== filters.category) return n;
      if (filters.priority && n.priority !== filters.priority) return n;
      if (filters.from) {
        const fromTs = new Date(filters.from).getTime();
        if (new Date(n.created_at).getTime() < fromTs) return n;
      }
      if (filters.to) {
        const toTs = new Date(filters.to).getTime();
        if (new Date(n.created_at).getTime() > toTs) return n;
      }
      return {
        ...n,
        status: NotificationStatus.Read as const,
        read_at: n.read_at ?? now,
      };
    });
    saveNotifications(userId, items);
    return { ok: true };
  },
};

export type { LocalNotificationsService };

export const localStorageApi = {
  request: async <T,>(
    path: string,
    options: RequestInit = {},
    params?: Record<string, unknown>,
  ): Promise<T> => {
    void path;
    void options;
    void params;
    throw new Error("storage.request não está disponível no modo local");
  },
  ...localStorageBackend,
};
