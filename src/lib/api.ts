// Altere a primeira linha para isto:
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

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = 5000,
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    console.error(`Fetch error on ${url}:`, error);
    throw error;
  }
};

export const api = {
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

  // Goals
  getGoalsStatus: async (): Promise<Goal[]> => {
    try {
      return await fetchWithTimeout(`${API_URL}/goals/status`);
    } catch (e) {
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
  getSummary: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/dashboard-summary`);
    } catch (e) {
      return {
        incomes: 0,
        expenses: 0,
        total: 0,
      };
    }
  },

  // Insights
  getInsights: async (): Promise<InsightData | null> => {
    try {
      return await fetchWithTimeout(`${API_URL}/insights`);
    } catch (e) {
      return null;
    }
  },

  // Charts
  getChartData: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/chart-data`);
    } catch (e) {
      return [];
    }
  },
};
