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
  hover = false,
  glow = false,
  padding = "md",
}: CardProps) {
  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-4 sm:p-6",
    lg: "p-5 sm:p-7",
  }[padding];

  return (
    <div
      className={`
        rounded-[var(--lifeos-radius-surface)]
        border
        border-lifeos-border
        bg-lifeos-surface

        ${paddingClass}

        shadow-[var(--lifeos-shadow-surface)]

        transition-colors
        duration-150

        ${
          hover
            ? "hover:border-lifeos-accent hover:bg-lifeos-surface-secondary"
            : ""
        }

        ${
          glow
            ? "ring-1 ring-lifeos-accent/15"
            : ""
        }

        ${className}
      `}
    >
      {children}
    </div>
  );
}
