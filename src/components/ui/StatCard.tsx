import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  color?: string;
  className?: string;
}

export default function StatCard({
  icon,
  title,
  value,
  color = "text-cyan-400",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-slate-800
        bg-slate-900
        p-8
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-cyan-500/30
        hover:shadow-2xl
        hover:shadow-cyan-500/10
        ${className}
      `}
    >
      <div className={`text-3xl ${color}`}>
        {icon}
      </div>

      <p className="mt-5 text-sm uppercase tracking-widest text-slate-500">
        {title}
      </p>

      <h2 className="mt-3 text-5xl font-black">
        {value}
      </h2>
    </div>
  );
}