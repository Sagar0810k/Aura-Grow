"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ChartData {
  time: string
  moisture: number
  temperature: number
}

interface SensorChartProps {
  data: ChartData[]
}

export function SensorChart({ data }: SensorChartProps) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="time" className="text-muted-foreground" fontSize={12} />
          <YAxis className="text-muted-foreground" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              color: "hsl(var(--card-foreground))",
            }}
          />
          <Line
            type="monotone"
            dataKey="moisture"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Soil Moisture (%)"
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Temperature (°C)"
            dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


