import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

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
        border-lifeos-border
        bg-lifeos-input
        px-5
        py-4
        text-lifeos-text
        placeholder:text-lifeos-muted
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
