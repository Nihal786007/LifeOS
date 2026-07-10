import { ReactNode } from "react";
import { motion } from "framer-motion";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`
        rounded-2xl
        border
        border-slate-800
        bg-slate-900/80
        backdrop-blur-md
        shadow-lg
        p-6
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}