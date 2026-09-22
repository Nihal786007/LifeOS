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
    <section className="rounded-3xl border border-lifeos-border bg-lifeos-surface-secondary p-10 shadow-sm">

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <p className="text-xs uppercase tracking-[0.4em] text-lifeos-accent">
            {badge}
          </p>

          <h1 className="mt-5 text-5xl font-black text-lifeos-text">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-xl leading-8 text-lifeos-text-secondary">
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
