export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export type Transaction = {
  id?: number;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
};

export type Goal = {
  id: number;
  goal_name: string;
  target: number;
  current: number;
  missing: number;
  percent: number;
  deadline?: string;
  completed: boolean;
};

export type GoalStatus = "active" | "completed" | "all";

export type InsightData = {
  alerta: string;
  previsao_proximo_mes: number;
  economias_sugeridas: number;
  media_gastos: number;
  variacao_percentual: number;
  historico: {
    mes: string;
    valor: number;
  }[];
};

export type DashboardSummary = {
  incomes: number;
  expenses: number;
  total: number;
  balance_trend_percentage: number;
  expense_ratio: number;
};

export type ChartDataPoint = {
  name: string;
  income: number;
  expense: number;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
};

export type AuthSession = {
  session_token: string;
  user: UserProfile;
  expires_at: string;
};

export type HttpErrorKind =
  | "network_unavailable"
  | "timeout"
  | "http_4xx"
  | "http_5xx"
  | "unknown";

export class HttpError extends Error {
  readonly kind: HttpErrorKind;
  readonly status?: number;
  readonly responseBody?: unknown;

  constructor(
    message: string,
    kind: HttpErrorKind,
    status?: number,
    responseBody?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.kind = kind;
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function isBackendUnavailableError(error: unknown): boolean {
  if (!(error instanceof HttpError)) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return true;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }
    return false;
  }
  return (
    error.kind === "network_unavailable" ||
    error.kind === "timeout" ||
    error.kind === "http_5xx"
  );
}

export function isAuthOrValidationError(error: unknown): boolean {
  if (!(error instanceof HttpError)) return false;
  return error.kind === "http_4xx";
}

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = 10000,
) => {
  const controller = new AbortController();

  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      let responseBody: unknown = undefined;
      try {
        responseBody = await response.json();
      } catch {
        // ignore parse errors for error bodies
      }

      const kind: HttpErrorKind =
        response.status >= 500 ? "http_5xx" : "http_4xx";

      throw new HttpError(
        `HTTP error! status: ${response.status}`,
        kind,
        response.status,
        responseBody,
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);

    console.error(`Fetch error on ${url}:`, error);

    if (error instanceof HttpError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(
        `Request timed out: ${url}`,
        "timeout",
        undefined,
        undefined,
      );
    }

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new HttpError(
        `Backend unavailable: ${url}`,
        "network_unavailable",
        undefined,
        undefined,
      );
    }

    throw new HttpError(
      error instanceof Error ? error.message : "Unknown fetch error",
      "unknown",
      undefined,
      undefined,
    );
  }
};

export const api = {
  request: async <T,>(
    path: string,
    options: RequestInit = {},
    params?: Record<string, unknown>,
  ): Promise<T> => {
    let url = `${API_URL}${path}`;

    if (params && options.method === "GET") {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    if (params && options.method !== "GET") {
      requestOptions.body = JSON.stringify(params);
    }

    return await fetchWithTimeout(url, requestOptions);
  },

  // Utility
  resetDatabase: () =>
    fetchWithTimeout(`${API_URL}/reset`, {
      method: "DELETE",
    }),
  // Transactions

  getTransactions: async (): Promise<Transaction[]> => {
    try {
      return await fetchWithTimeout(`${API_URL}/transactions`);
    } catch (e) {
      console.error("Erro ao buscar transações:", e);

      return [];
    }
  },

  createTransaction: async (data: Partial<Transaction>) => {
    return await fetchWithTimeout(`${API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  updateTransaction: async (id: number, data: Partial<Transaction>) => {
    return await fetchWithTimeout(`${API_URL}/transactions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  deleteTransaction: async (id: number) => {
    return await fetchWithTimeout(`${API_URL}/transactions/${id}`, {
      method: "DELETE",
    });
  },

  // Goals
  getGoalsStatus: async (): Promise<Goal[]> => {
    try {
      return await fetchWithTimeout(`${API_URL}/goals/status`);
    } catch (e) {
      console.error("Erro ao buscar metas:", e);

      return [];
    }
  },

  createGoal: async (data: Partial<Goal>) => {
    return await fetchWithTimeout(`${API_URL}/goals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  depositGoal: async (id: number, amount: number) => {
    return await fetchWithTimeout(`${API_URL}/goals/${id}/deposit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });
  },

  completeGoal: async (id: number) => {
    return await fetchWithTimeout(`${API_URL}/goals/${id}/complete`, {
      method: "POST",
    });
  },

  deleteGoal: async (id: number) => {
    return await fetchWithTimeout(`${API_URL}/goals/${id}`, {
      method: "DELETE",
    });
  },

  // Dashboard
  getSummary: async (): Promise<DashboardSummary> => {
    try {
      return await fetchWithTimeout(`${API_URL}/dashboard-summary`);
    } catch (e) {
      console.error("Erro ao buscar resumo:", e);

      return {
        incomes: 0,
        expenses: 0,
        total: 0,
        balance_trend_percentage: 0,
        expense_ratio: 0,
      };
    }
  },

  // Insights
  getInsights: async (): Promise<InsightData | null> => {
    try {
      return await fetchWithTimeout(`${API_URL}/insights`);
    } catch (e) {
      console.error("Erro ao buscar insights:", e);

      return null;
    }
  },

  // Charts
  getChartData: async (): Promise<ChartDataPoint[]> => {
    try {
      return await fetchWithTimeout(`${API_URL}/chart-data`);
    } catch (e) {
      console.error("Erro ao buscar gráficos:", e);

      return [];
    }
  },

  // Authentication
  forgotPassword: async (email: string) => {
    return await fetchWithTimeout(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
  },

  login: async (data: { email: string; password: string }): Promise<AuthSession> => {
    return await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  register: async (data: { name: string; email: string; password: string }): Promise<AuthSession> => {
    return await fetchWithTimeout(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  logout: async (sessionToken: string) => {
    return await fetchWithTimeout(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  },

  getProfile: async (): Promise<UserProfile> => {
    return await fetchWithTimeout(`${API_URL}/auth/profile`, {
      method: "GET",
    });
  },
};
