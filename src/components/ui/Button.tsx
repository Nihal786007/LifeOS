type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function Button({
  children,
  onClick,
  className = "",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-700 ${className}`}
    >
      {children}
    </button>
  );
}