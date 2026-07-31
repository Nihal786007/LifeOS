import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;

  /**
   * Enables hover animation
   */
  hover?: boolean;

  /**
   * Adds subtle cyan glow
   */
  glow?: boolean;

  /**
   * Built-in padding presets
   */
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  children,
  className = "",
  hover = true,
  glow = false,
  padding = "md",
}: CardProps) {
  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  return (
    <div
      className={`
        rounded-3xl
        border
        border-cyan-500/15
        bg-slate-900/40
        backdrop-blur-xl

        ${paddingClass}

        shadow-xl

        transition-all
        duration-300

        ${
          hover
            ? "hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-2xl hover:shadow-cyan-500/10"
            : ""
        }

        ${
          glow
            ? "ring-1 ring-cyan-500/20"
            : ""
        }

        ${className}
      `}
    >
      {children}
    </div>
  );
}