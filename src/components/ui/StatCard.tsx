import type { ReactNode } from "react";
import Card from "./Card";

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  color?: string;
  className?: string;
}

export default function StatCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  color = "text-cyan-400",
  className = "",
}: StatCardProps) {
  return (
    <Card
      className={`group ${className}`}
      padding="lg"
    >
      <div
        className={`text-3xl transition-transform duration-300 group-hover:scale-110 ${color}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-sm uppercase tracking-[0.25em] text-slate-500">
        {title}
      </p>

      <h2 className="mt-3 text-5xl font-black">
        {value}
      </h2>

      {subtitle && (
        <p className="mt-2 text-sm text-slate-400">
          {subtitle}
        </p>
      )}

      {trend && (
        <p className="mt-4 text-sm font-semibold text-emerald-400">
          {trend}
        </p>
      )}
    </Card>
  );
}