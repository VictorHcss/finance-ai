"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function FinanceChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/chart-data")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Erro ao carregar dados do gráfico:", err));
  }, []);

  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-400">Fluxo Mensal</h3>

      <div className="h-[300px] min-w-0">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#27272a"
            />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 12 }}
            />

            <YAxis hide />

            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "#10b981" }}
            />

            <Area
              type="monotone"
              dataKey="total"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
