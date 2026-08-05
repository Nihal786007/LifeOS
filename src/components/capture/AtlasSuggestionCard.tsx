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
        border-cyan-500/30
        bg-cyan-500/10
        p-5
        backdrop-blur-md
      "
    >
      {/* Header */}

      <div className="flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-2xl">
          🤖
        </div>

        <div>

          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            ATLAS Intelligence
          </p>

          <h3 className="mt-1 text-xl font-bold text-white">
            {suggestion.title}
          </h3>

        </div>

      </div>

      {/* Confidence */}

      <div className="mt-6">

        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Confidence
        </p>

        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">

          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{
              width: `${suggestion.confidence}%`,
            }}
          />

        </div>

        <p className="mt-2 text-sm text-cyan-300">
          {suggestion.confidence}% confidence
        </p>

      </div>

      {/* Reason */}

      <div className="mt-6">

        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Reason
        </p>

        <p className="mt-2 leading-7 text-slate-300">
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