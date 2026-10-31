import type { IntentResult } from "../../atlas/types";

import Button from "../ui/Button";

interface AtlasSuggestionCardProps {
  suggestion: IntentResult | null;

  onPrimaryAction?: () => void;
}

export default function AtlasSuggestionCard({
  suggestion,
  onPrimaryAction,
}: AtlasSuggestionCardProps) {
  if (!suggestion) return null;

  return (
    <div
      className="
        mt-6
        rounded-2xl
        border
        border-lifeos-accent/30
        bg-lifeos-accent/10
        p-5
        backdrop-blur-md
      "
    >
      {/* Header */}

      <div className="flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lifeos-accent/20 text-2xl">
          🤖
        </div>

        <div>

          <p className="text-xs uppercase tracking-[0.12em] text-lifeos-accent">
            ATLAS Intelligence
          </p>

          <h3 className="mt-1 text-xl font-bold text-lifeos-text">
            {suggestion.title}
          </h3>

        </div>

      </div>

      {/* Confidence */}

      <div className="mt-6">

        <p className="text-xs uppercase tracking-[0.12em] text-lifeos-text-secondary">
          Confidence
        </p>

        <div className="mt-2 h-3 overflow-hidden rounded-full bg-lifeos-elevated">

          <div
            className="h-full rounded-full bg-lifeos-accent transition-all duration-500"
            style={{
              width: `${suggestion.confidence}%`,
            }}
          />

        </div>

        <p className="mt-2 text-sm text-lifeos-accent">
          {suggestion.confidence}% confidence
        </p>

      </div>

      {/* Reason */}

      <div className="mt-6">

        <p className="text-xs uppercase tracking-[0.12em] text-lifeos-text-secondary">
          Reason
        </p>

        <p className="mt-2 leading-7 text-lifeos-text-secondary">
          {suggestion.reason}
        </p>

      </div>

      {/* Actions */}

      <div className="mt-8 flex gap-4">

        <Button
          onClick={onPrimaryAction}
        >
          🚀 {suggestion.actionLabel}
        </Button>

      </div>

    </div>
  );
}