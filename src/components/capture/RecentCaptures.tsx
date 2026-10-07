import { useState } from "react";
import { FaBolt, FaCopy, FaTrash } from "react-icons/fa";
import { useApp } from "../../context/AppContext";

export default function RecentCaptures() {
  const { captures, capturePersistence, deleteCapture } = useApp();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const recent = [...captures].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const loading = ["uninitialized", "opening", "migration"].includes(capturePersistence.phase);

  async function copy(text: string) {
    setError("");
    try { await navigator.clipboard.writeText(text); setStatus("Thought copied."); }
    catch { setError("Could not copy. You can select the thought and copy it manually."); }
  }

  async function remove(id: number) {
    if (!window.confirm("Permanently delete this captured thought from your account?")) return;
    setDeleting(id); setError("");
    try { await deleteCapture(id); setStatus("Thought deleted."); }
    catch { setError("Could not delete this thought. Please try again."); }
    finally { setDeleting(null); }
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
                <button type="button" aria-label={`Delete thought: ${capture.text}`} disabled={deleting === capture.id} onClick={() => void remove(capture.id)} className="lifeos-icon-button text-lifeos-danger disabled:opacity-50"><FaTrash aria-hidden="true" /></button>
              </div>
            </div>
          </li>)}
        </ul>}
      <p role="status" className="mt-3 text-xs text-lifeos-muted">{status}</p>
      {error && <p role="alert" className="mt-3 text-sm text-lifeos-danger">{error}</p>}
    </section>
  );
}
