import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-slate-800
        bg-slate-900
        p-6
        shadow-lg
        transition-all
        duration-300
        hover:border-cyan-500/30
        hover:shadow-cyan-500/10
        hover:shadow-2xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}