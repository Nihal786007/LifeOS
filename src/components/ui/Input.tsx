import type { InputHTMLAttributes } from "react";

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {}

export default function Input({
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`
        w-full
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        px-5
        py-4
        text-white
        placeholder:text-slate-500
        outline-none
        transition-all
        duration-300
        focus:border-cyan-500
        focus:ring-2
        focus:ring-cyan-500/20
        ${className}
      `}
    />
  );
}