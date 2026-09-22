import type { ReactNode } from "react";

import Card from "./Card";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({
  open,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-lifeos-overlay backdrop-blur-sm p-4">
      <Card
        className="w-full max-w-xl border border-lifeos-border bg-lifeos-surface"
        hover={false}
        padding="lg"
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-lifeos-text">
              {title}
            </h2>

            {description && (
              <p className="mt-2 text-lifeos-text-secondary">
                {description}
              </p>
            )}
          </div>

          {children}

          {footer && (
            <div className="flex justify-end gap-4">
              {footer}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
