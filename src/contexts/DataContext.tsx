"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  api,
  ChartDataPoint,
  DashboardSummary,
  Goal,
  InsightData,
  Transaction,
} from "@/lib/api";

interface DataContextType {
  transactions: Transaction[];
  goals: Goal[];
  summary: DashboardSummary;
  insights: InsightData | null;
  chartData: ChartDataPoint[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshInsights: () => Promise<void>;
  refreshChartData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    incomes: 0,
    expenses: 0,
    total: 0,
    balance_trend_percentage: 0,
    expense_ratio: 0,
  });
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const withLoading = useCallback(async <T,>(action: () => Promise<T>) => {
    setLoading(true);
    try {
      return await action();
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    const data = await api.getTransactions();
    setTransactions(data);
  }, []);

  const fetchGoals = useCallback(async () => {
    const data = await api.getGoalsStatus();
    setGoals(data);
  }, []);

  const fetchSummary = useCallback(async () => {
    const data = await api.getSummary();
    setSummary(data);
  }, []);

  const fetchInsights = useCallback(async () => {
    const data = await api.getInsights();
    setInsights(data);
  }, []);

  const fetchChartData = useCallback(async () => {
    const data = await api.getChartData();
    setChartData(data);
  }, []);

  const refreshTransactions = useCallback(
    async () => withLoading(fetchTransactions),
    [fetchTransactions, withLoading],
  );

  const refreshGoals = useCallback(
    async () => withLoading(fetchGoals),
    [fetchGoals, withLoading],
  );

  const refreshSummary = useCallback(
    async () => withLoading(fetchSummary),
    [fetchSummary, withLoading],
  );

  const refreshInsights = useCallback(
    async () => withLoading(fetchInsights),
    [fetchInsights, withLoading],
  );

  const refreshChartData = useCallback(
    async () => withLoading(fetchChartData),
    [fetchChartData, withLoading],
  );

  const refreshAll = useCallback(async () => {
    await withLoading(async () => {
      await Promise.all([
        fetchTransactions(),
        fetchGoals(),
        fetchSummary(),
        fetchInsights(),
        fetchChartData(),
      ]);
    });
  }, [fetchChartData, fetchGoals, fetchInsights, fetchSummary, fetchTransactions, withLoading]);

  return (
    <DataContext.Provider
      value={{
        transactions,
        goals,
        summary,
        insights,
        chartData,
        loading,
        refreshAll,
        refreshTransactions,
        refreshGoals,
        refreshSummary,
        refreshInsights,
        refreshChartData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
