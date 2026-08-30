"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Payment Link", value: 100, color: "#B7C4FF" },
];

export function RevenueDonutChart() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Revenue Overview</h3>
        <button className="text-[11px] text-subtle flex items-center bg-muted px-2 py-1 rounded-md">
          This Month <span className="ml-1 text-[8px]">▼</span>
        </button>
      </div>
      
      <div className="relative flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: "8px" }}
              itemStyle={{ color: "rgb(var(--text))" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-subtle">Total Revenue</p>
          <p className="text-lg font-bold text-text">₦100</p>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-subtle">
          <span className="h-2 w-2 rounded-full bg-[var(--coral)]"></span>
          PAYMENT LINK
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-[var(--coral)] w-full"></div>
          </div>
          <span className="text-subtle">100%</span>
        </div>
      </div>
    </div>
  );
}
