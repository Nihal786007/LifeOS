import { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
};

export default function StatCard({
  title,
  value,
  icon,
  color,
}: Props) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 transition-all duration-300 hover:scale-105 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20">
      <div className="flex justify-between items-center">

        <div>

          <p className="text-slate-400 text-sm">
            {title}
          </p>

          <h2 className="text-4xl font-bold mt-3">
            {value}
          </h2>

        </div>

        <div
          className={`text-5xl ${color}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}