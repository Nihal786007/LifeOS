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
    <section className="lifeos-page-header">

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <p className="lifeos-page-eyebrow">
            {badge}
          </p>

          <h1 className="lifeos-page-title">
            {title}
          </h1>

          <p className="lifeos-page-description">
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
