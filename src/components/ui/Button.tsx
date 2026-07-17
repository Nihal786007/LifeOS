import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
}

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
    secondary:
      "bg-slate-800 text-white hover:bg-slate-700",
    danger:
      "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button
      {...props}
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-2xl
        px-6
        py-3
        font-semibold
        transition-all
        duration-300
        hover:scale-[1.02]
        active:scale-95
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}