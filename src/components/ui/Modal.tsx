import { useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import Card from "./Card";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  dismissOnBackdrop?: boolean;
}

export default function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  dismissOnBackdrop = false,
}: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissible = Boolean(onClose);
  useLayoutEffect(() => {
    if (!open || !dismissible) return;
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    // Scrollable containers can receive native initial focus. Start on a real
    // control instead, without relying on React autoFocus before showModal().
    element?.querySelector<HTMLElement>('input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), a[href]')?.focus();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected && !previousFocus.matches(":disabled")) previousFocus.focus();
    };
  }, [open, dismissible]);

  function wrapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if ((event.target as HTMLElement).closest('dialog') !== event.currentTarget) return;
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')].filter(element => !element.closest('[hidden], [inert]') && !element.matches(':disabled'));
    if (!controls.length) { event.preventDefault(); event.currentTarget.focus(); return; }
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if (!open) return null;

  const content = (
      <Card
        className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto border border-lifeos-border bg-lifeos-surface"
        hover={false}
        padding="lg"
      >
        <div role={dismissible ? undefined : "dialog"} aria-modal={dismissible ? undefined : true} aria-labelledby={dismissible ? undefined : titleId} className="space-y-6">
          <div>
            <h2 id={titleId} className="text-2xl font-bold text-lifeos-text">
              {title}
            </h2>

            {description && (
              <p id={`${titleId}-description`} className="mt-2 text-lifeos-text-secondary">
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
  );
  // Existing callers retain their original overlay contract. A caller opts in
  // to native modality and dismissal only by providing its cancellation path.
  return dismissible ? (
    <dialog ref={dialog} onMouseDown={event => { if (dismissOnBackdrop && event.target === event.currentTarget) onClose?.(); }} aria-labelledby={titleId} aria-describedby={description ? `${titleId}-description` : undefined} onKeyDown={wrapFocus} onCancel={event => {
      if (event.target !== event.currentTarget) return;
      event.preventDefault(); onClose?.();
    }} className="m-auto max-h-none w-[calc(100%-2rem)] max-w-xl overflow-visible border-0 bg-transparent p-0 text-lifeos-text backdrop:bg-lifeos-overlay backdrop:backdrop-blur-sm">{content}</dialog>
  ) : (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-lifeos-overlay backdrop-blur-sm p-4">{content}</div>
  );
}
