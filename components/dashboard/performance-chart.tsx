"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = Array.from({ length: 30 }).map((_, idx) => ({
  day: idx + 1,
  revenue: idx === 28 ? 100 : idx === 27 || idx === 29 ? 10 : 0,
  visits: idx === 28 ? 6 : idx === 27 || idx === 29 ? 2 : 0,
  leads: idx === 28 ? 1 : 0
}));

export function PerformanceChart() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Performance</h3>
        <div className="flex items-center gap-4 text-[10px] text-subtle">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]"></span>
            Revenue
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]"></span>
            Visits
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--mint)]"></span>
            Leads
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              stroke="currentColor"
              className="text-subtle opacity-50"
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="currentColor"
              className="text-subtle opacity-50"
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickLine={false} 
              axisLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(var(--surface))",
                border: "1px solid rgb(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgb(var(--text))" }}
              itemStyle={{ color: "rgb(var(--text))" }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#B7C4FF" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="visits" stroke="#FF6A45" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="leads" stroke="#9BE3C0" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
