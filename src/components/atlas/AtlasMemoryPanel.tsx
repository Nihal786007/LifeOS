import { useState } from "react";
import {
  FaBrain,
  FaFloppyDisk,
  FaTrashCan,
} from "react-icons/fa6";

import type {
  AtlasMemoryController,
} from "../../atlas/memory/useAtlasMemory";
import {
  ATLAS_MEMORY_MAX_CONTENT_LENGTH,
  ATLAS_MEMORY_MAX_TOPIC_LENGTH,
  ATLAS_MEMORY_TYPES,
} from "../../atlas/memory/types.ts";
import type {
  AtlasMemoryType,
} from "../../atlas/memory/types";

interface AtlasMemoryPanelProps {
  memory: AtlasMemoryController;
}

const TYPE_LABELS: Readonly<Record<AtlasMemoryType, string>> = {
  preference: "Preference",
  decision: "Decision",
  constraint: "Constraint",
  important_context: "Important context",
};

export default function AtlasMemoryPanel({
  memory,
}: AtlasMemoryPanelProps) {
  const [type, setType] =
    useState<AtlasMemoryType>("preference");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string>();

  function save() {
    try {
      memory.saveMemory({ type, topic, content });
      setTopic("");
      setContent("");
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "ATLAS could not save this memory."
      );
    }
  }

  return (
    <section className="rounded-[var(--lifeos-radius-surface)] border border-lifeos-chart-secondary/15 bg-lifeos-chart-secondary/[0.035] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FaBrain className="text-lifeos-chart-secondary" />
          <div>
            <h2 className="font-bold text-lifeos-text">Memory</h2>
            <p className="mt-1 text-xs leading-5 text-lifeos-muted">
              Explicit context only · never canonical evidence
            </p>
          </div>
        </div>
        {memory.items.length > 0 && (
          <button
            type="button"
            onClick={() => memory.clearAll()}
            className="text-[11px] font-bold uppercase tracking-wider text-lifeos-muted transition hover:text-lifeos-danger"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <select
          aria-label="Memory type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as AtlasMemoryType)
          }
          className="w-full rounded-xl border border-lifeos-border bg-lifeos-app px-3 py-2.5 text-sm text-lifeos-text outline-none focus:border-lifeos-chart-secondary/50"
        >
          {ATLAS_MEMORY_TYPES.map((value) => (
            <option key={value} value={value}>
              {TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <input
          aria-label="Memory topic"
          value={topic}
          maxLength={ATLAS_MEMORY_MAX_TOPIC_LENGTH}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Topic, e.g. SAT study time"
          className="w-full rounded-xl border border-lifeos-border bg-lifeos-app px-3 py-2.5 text-sm text-lifeos-text outline-none placeholder:text-lifeos-muted focus:border-lifeos-chart-secondary/50"
        />
        <textarea
          aria-label="Memory content"
          value={content}
          maxLength={ATLAS_MEMORY_MAX_CONTENT_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Exact context you want ATLAS to remember"
          className="min-h-20 w-full resize-none rounded-xl border border-lifeos-border bg-lifeos-app px-3 py-2.5 text-sm leading-5 text-lifeos-text outline-none placeholder:text-lifeos-muted focus:border-lifeos-chart-secondary/50"
        />
        {error && (
          <p className="text-xs text-lifeos-danger">{error}</p>
        )}
        {memory.persistenceError && (
          <p className="text-xs text-lifeos-danger">{memory.persistenceError}</p>
        )}
        <button
          type="button"
          disabled={!memory.ready || !topic.trim() || !content.trim()}
          onClick={save}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-lifeos-chart-secondary/20 bg-lifeos-chart-secondary/10 px-4 py-2.5 text-sm font-bold text-lifeos-chart-secondary transition hover:bg-lifeos-chart-secondary/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FaFloppyDisk />
          Save explicitly
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {memory.activeMemories.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-lifeos-chart-secondary/10 bg-lifeos-app/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-lifeos-chart-secondary">
                  {TYPE_LABELS[item.type]} · Active
                </p>
                <p className="mt-1 text-sm font-semibold text-lifeos-text">
                  {item.topic}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete memory ${item.topic}`}
                onClick={() => memory.deleteMemory(item.id)}
                className="text-lifeos-muted transition hover:text-lifeos-danger"
              >
                <FaTrashCan />
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-lifeos-text-secondary">
              {item.content}
            </p>
          </article>
        ))}

        {!memory.ready ? (
          <p className="rounded-xl border border-dashed border-lifeos-border p-4 text-xs leading-5 text-lifeos-muted">
            Loading explicit memories…
          </p>
        ) : memory.activeMemories.length === 0 && (
          <p className="rounded-xl border border-dashed border-lifeos-border p-4 text-xs leading-5 text-lifeos-muted">
            No active memories. Questions and ATLAS answers are not
            remembered automatically.
          </p>
        )}
      </div>

      {memory.supersededMemories.length > 0 && (
        <details className="mt-4 border-t border-lifeos-border pt-4">
          <summary className="cursor-pointer text-xs font-semibold text-lifeos-muted">
            Superseded history · {memory.supersededMemories.length}
          </summary>
          <div className="mt-3 space-y-2">
            {memory.supersededMemories.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-lifeos-app/40 p-3"
              >
                <div>
                  <p className="text-xs font-semibold text-lifeos-text-secondary">
                    {item.topic}
                  </p>
                  <p className="mt-1 text-xs text-lifeos-muted">
                    {item.content}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete superseded memory ${item.topic}`}
                  onClick={() => memory.deleteMemory(item.id)}
                  className="text-lifeos-muted transition hover:text-lifeos-danger"
                >
                  <FaTrashCan />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
