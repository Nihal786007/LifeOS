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
  color = "text-lifeos-accent",
  className = "",
}: StatCardProps) {
  return (
    <Card
      className={`group ${className}`}
      padding="lg"
    >
      <div
        className={`text-xl ${color}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-medium tracking-wide text-lifeos-muted">
        {title}
      </p>

      <h2 className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </h2>

      {subtitle && (
        <p className="mt-2 text-sm text-lifeos-text-secondary">
          {subtitle}
        </p>
      )}

      {trend && (
        <p className="mt-4 text-sm font-semibold text-lifeos-success">
          {trend}
        </p>
      )}
    </Card>
  );
}