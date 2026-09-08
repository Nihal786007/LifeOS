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
  ) => void;
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

    onClose();
  }

  // ==========================================
  // Standard Capture
  // ==========================================

  function handleCapture() {
    const trimmedText =
      text.trim();

    if (!trimmedText) {
      return;
    }

    onCapture(
      trimmedText
    );

    resetAndClose();
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
        bg-black/70
        p-4
        backdrop-blur-sm
      "
    >
      <Card
        className="
          flex
          h-[90vh]
          w-full
          max-w-2xl
          flex-col
          border
          border-cyan-500/20
          bg-slate-900
          shadow-2xl
          shadow-cyan-500/20
        "
      >
        {/* ======================================
            Header
        ====================================== */}

        <div
          className="
            border-b
            border-slate-800
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
                  text-slate-400
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
            className="
              w-full
              resize-none
              rounded-2xl
              border
              border-slate-700
              bg-slate-950
              p-5
              text-white
              outline-none
              transition
              focus:border-cyan-500
            "
          />
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
          >
            Cancel
          </Button>

          <Button
            onClick={
              handleCapture
            }
            disabled={text.trim().length === 0}
          >
            Capture
          </Button>
        </div>
      </Card>
    </div>
  );
}
