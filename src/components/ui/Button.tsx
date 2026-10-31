import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-lifeos-accent text-lifeos-accent-foreground hover:opacity-90",
    secondary:
      "border border-lifeos-border bg-lifeos-elevated text-lifeos-text hover:bg-lifeos-hover",
    danger:
      "bg-lifeos-danger text-lifeos-danger-foreground hover:opacity-90",
    ghost:
      "bg-transparent text-lifeos-text-secondary hover:bg-lifeos-hover hover:text-lifeos-text",
  };

  return (
    <button
      {...props}
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        min-h-11
        rounded-[var(--lifeos-radius-control)]
        px-4
        py-2.5
        text-sm
        font-semibold
        transition-colors
        duration-150
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-lifeos-focus
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
