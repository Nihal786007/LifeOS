import type { ReactNode } from "react";

interface PageHeroProps {
  badge: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export default function PageHero({
  badge,
  title,
  description,
  children,
}: PageHeroProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-cyan-900/40 via-slate-900 to-slate-950 p-10 shadow-2xl">

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">
            {badge}
          </p>

          <h1 className="mt-5 text-5xl font-black">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-xl leading-8 text-slate-400">
            {description}
          </p>

        </div>

        {children && (
          <div>
            {children}
          </div>
        )}

      </div>

    </section>
  );
}