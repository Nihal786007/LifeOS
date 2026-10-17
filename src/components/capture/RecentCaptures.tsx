import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { FaBolt, FaCopy, FaTrash } from "react-icons/fa";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../auth/AuthContext";
import { useAccountData } from "../../data/account/AccountDataContext";
import { CaptureDeletionGuard } from "./captureDeletion";
import type { CaptureDeletionTarget } from "./captureDeletion";

function DeleteCaptureConfirmation({ target, onCancel, onConfirm }: {
  target: CaptureDeletionTarget; onCancel(): void; onConfirm(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const previousFocus = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    cancelButton.current?.focus();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected && !previousFocus.matches(":disabled")) previousFocus.focus();
    };
  }, []);

  function wrapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    // Native modality makes the background inert, but Chromium can move Tab to
    // browser chrome after the last control. Keep this two-button review cycle
    // inside the dialog, without intercepting Escape or global keyboard input.
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    if (buttons.length === 0) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.shiftKey
      ? (index <= 0 ? buttons.length - 1 : index - 1)
      : (index < 0 || index === buttons.length - 1 ? 0 : index + 1);
    buttons[next].focus();
  }

  return <dialog ref={dialog} aria-labelledby="delete-capture-title" aria-describedby="delete-capture-description" onKeyDown={wrapFocus} onCancel={event => { event.preventDefault(); onCancel(); }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-lifeos-border bg-lifeos-surface p-5 text-lifeos-text shadow-xl backdrop:bg-lifeos-overlay sm:p-6">
    <h2 id="delete-capture-title" className="text-lg font-bold">Permanently delete this thought?</h2>
    <p id="delete-capture-description" className="mt-2 text-sm text-lifeos-text-secondary">Only the thought shown below will be deleted from this account, including its synced copy. This cannot be undone.</p>
    <p className="mt-4 break-all text-xs text-lifeos-muted">Capture ID: {target.id}</p>
    <blockquote className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-lifeos-border bg-lifeos-surface-secondary p-4 text-sm [overflow-wrap:anywhere]">{target.text}</blockquote>
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      <button ref={cancelButton} type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-lifeos-border bg-lifeos-surface-secondary px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-focus">Cancel</button>
      <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl border border-lifeos-danger px-4 py-2 text-sm font-semibold text-lifeos-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-focus">Permanently delete</button>
    </div>
  </dialog>;
}

export default function RecentCaptures() {
  const { captures, capturePersistence, deleteCapture } = useApp();
  const auth = useAuth();
  const account = useAccountData();
  const [guard] = useState(() => new CaptureDeletionGuard());
  const [selection, setSelection] = useState<CaptureDeletionTarget | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const recent = [...captures].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const loading = ["uninitialized", "opening", "migration"].includes(capturePersistence.phase);
  const current = {
    ownerId: auth.identity?.userId ?? null, scope: account.services,
    ready: auth.phase === "signed-in" && account.phase === "ready" &&
      account.ownerUserId === auth.identity?.userId && capturePersistence.phase === "hydrated",
    captures, deleteCapture,
  };
  const latest = useRef(current);
  const mounted = useRef(false);
  const validSelection = guard.isCurrent(selection, current);
  useLayoutEffect(() => {
    latest.current = current;
    // Cancel invalid approval even if the old values later reappear.
    if (selection && !validSelection) guard.cancel();
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; guard.cancel(); };
  }, [guard]);

  async function copy(text: string) {
    setError("");
    try { await navigator.clipboard.writeText(text); setStatus("Thought copied."); }
    catch { setError("Could not copy. You can select the thought and copy it manually."); }
  }

  function review(id: number) {
    if (deleting !== null) return;
    setError(""); setStatus("");
    setSelection(guard.select(id, latest.current));
  }

  function cancel() { guard.cancel(); setSelection(null); }

  async function remove(target: CaptureDeletionTarget) {
    const state = latest.current;
    const result = guard.confirm(target, state, state.deleteCapture);
    setSelection(null); setDeleting(target.id); setError("");
    const stillOwned = () => mounted.current && latest.current.ready &&
      latest.current.ownerId === target.ownerId && latest.current.scope === target.scope;
    try { if (await result && stillOwned()) setStatus("Thought deleted."); }
    catch { if (stillOwned()) setError("Could not delete this thought. Review it again before retrying."); }
    finally { if (mounted.current) setDeleting(null); }
  }

  return (
    <section className="lifeos-surface-panel p-5 sm:p-6" aria-labelledby="capture-inbox-heading">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="lifeos-page-eyebrow">Saved thoughts</p>
          <h2 id="capture-inbox-heading" className="mt-1 text-lg font-bold text-lifeos-text">Capture inbox</h2>
          <p className="mt-2 text-sm text-lifeos-text-secondary">Pick up the ideas you saved without interrupting your work.</p>
        </div>
        <FaBolt className="shrink-0 text-lifeos-accent" aria-hidden="true" />
      </div>
      {loading ? <p role="status" className="mt-4 text-sm text-lifeos-muted">Loading captured thoughts…</p>
        : capturePersistence.phase === "error" ? <p role="alert" className="mt-4 text-sm text-lifeos-danger">{capturePersistence.error ?? "Captured thoughts could not load."}</p>
        : recent.length === 0 ? <p className="lifeos-empty-state mt-4">Nothing captured yet. Use Quick Capture to save a thought, note, or idea.</p>
        : <ul className="mt-4 space-y-3">
          {recent.map((capture) => <li key={capture.id} className="rounded-xl border border-lifeos-border bg-lifeos-surface-secondary p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-lifeos-text">{capture.text}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <time dateTime={capture.createdAt} className="text-xs text-lifeos-muted">{new Date(capture.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
              <div className="flex gap-2">
                <button type="button" aria-label={`Copy thought: ${capture.text}`} onClick={() => void copy(capture.text)} className="lifeos-icon-button"><FaCopy aria-hidden="true" /></button>
                <button type="button" aria-label={`Delete thought: ${capture.text}`} disabled={deleting !== null || !current.ready} onClick={() => review(capture.id)} className="lifeos-icon-button text-lifeos-danger disabled:opacity-50"><FaTrash aria-hidden="true" /></button>
              </div>
            </div>
          </li>)}
        </ul>}
      <p role="status" className="mt-3 text-xs text-lifeos-muted">{status}</p>
      {error && <p role="alert" className="mt-3 text-sm text-lifeos-danger">{error}</p>}
      {selection && !validSelection && deleting === null && <p role="alert" className="mt-3 text-sm text-lifeos-danger">This thought or account changed. Review the current thought again before deleting.</p>}
      {selection && validSelection && <DeleteCaptureConfirmation key={selection.id} target={selection} onCancel={cancel} onConfirm={() => void remove(selection)} />}
    </section>
  );
}
