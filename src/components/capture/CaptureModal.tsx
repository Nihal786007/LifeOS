import {
  useEffect,
  useState,
} from "react";

import {
  FaBolt,
} from "react-icons/fa";

import Button from "../ui/Button";
import Card from "../ui/Card";

// ==========================================
// Types
// ==========================================

interface CaptureModalProps {
  open: boolean;

  onClose: () => void;

  onCapture: (
    text: string
  ) => Promise<void>;
}

// ==========================================
// Component
// ==========================================

export default function CaptureModal({
  open,
  onClose,
  onCapture,
}: CaptureModalProps) {
  const [
    text,
    setText,
  ] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setText("");
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  // ==========================================
  // Reset
  // ==========================================

  function resetAndClose() {
    setText("");
    setError(null);

    onClose();
  }

  // ==========================================
  // Standard Capture
  // ==========================================

  async function handleCapture() {
    const trimmedText =
      text.trim();

    if (!trimmedText) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCapture(trimmedText);
      resetAndClose();
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Quick Capture could not be saved."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-capture-title"
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-lifeos-overlay
        p-4
        backdrop-blur-sm
      "
    >
      <Card
        className="
          flex
          max-h-[calc(100dvh-2rem)]
          w-full
          max-w-2xl
          flex-col
          border
          border-lifeos-border
          bg-lifeos-surface
        "
      >
        {/* ======================================
            Header
        ====================================== */}

        <div
          className="
            border-b
            border-lifeos-border
            p-6
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                rounded-xl
                bg-cyan-500/15
                p-3
                text-cyan-400
              "
            >
              <FaBolt />
            </div>

            <div>
              <h2
                id="quick-capture-title"
                className="
                  text-2xl
                  font-bold
                "
              >
                Quick Capture
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  text-lifeos-text-secondary
                "
              >
                Save a thought, note, or idea to your LifeOS inbox.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            Scrollable Content
        ====================================== */}

        <div
          className="
            flex-1
            overflow-y-auto
            p-6
          "
        >
          <textarea
            autoFocus
            rows={
              7
            }
            value={
              text
            }
            onChange={(
              event
            ) =>
              setText(
                event.target.value
              )
            }
            placeholder="What's on your mind?"
            className="lifeos-field w-full resize-none p-4"
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              Capture is still visible for this session, but local persistence
              failed: {error}
            </p>
          )}
        </div>

        {/* ======================================
            Footer
        ====================================== */}

        <div
          className="
            flex
            justify-end
            gap-4
            border-t
            border-slate-800
            p-6
          "
        >
          <Button
            variant="secondary"
            onClick={
              resetAndClose
            }
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            onClick={
              handleCapture
            }
            disabled={submitting || text.trim().length === 0}
          >
            {submitting ? "Saving…" : "Capture"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
