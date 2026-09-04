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
    <section className="rounded-[1.75rem] border border-violet-400/15 bg-violet-400/[0.035] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FaBrain className="text-violet-300" />
          <div>
            <h2 className="font-bold text-white">Memory</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Explicit context only · never canonical evidence
            </p>
          </div>
        </div>
        {memory.items.length > 0 && (
          <button
            type="button"
            onClick={() => memory.clearAll()}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-rose-300"
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
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400/50"
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
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-400/50"
        />
        <textarea
          aria-label="Memory content"
          value={content}
          maxLength={ATLAS_MEMORY_MAX_CONTENT_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Exact context you want ATLAS to remember"
          className="min-h-20 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm leading-5 text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-400/50"
        />
        {error && (
          <p className="text-xs text-rose-300">{error}</p>
        )}
        <button
          type="button"
          disabled={!topic.trim() || !content.trim()}
          onClick={save}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FaFloppyDisk />
          Save explicitly
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {memory.activeMemories.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-violet-300/10 bg-slate-950/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  {TYPE_LABELS[item.type]} · Active
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-200">
                  {item.topic}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete memory ${item.topic}`}
                onClick={() => memory.deleteMemory(item.id)}
                className="text-slate-600 transition hover:text-rose-300"
              >
                <FaTrashCan />
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {item.content}
            </p>
          </article>
        ))}

        {memory.activeMemories.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-700 p-4 text-xs leading-5 text-slate-500">
            No active memories. Questions and ATLAS answers are not
            remembered automatically.
          </p>
        )}
      </div>

      {memory.supersededMemories.length > 0 && (
        <details className="mt-4 border-t border-slate-800 pt-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">
            Superseded history · {memory.supersededMemories.length}
          </summary>
          <div className="mt-3 space-y-2">
            {memory.supersededMemories.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-slate-950/40 p-3"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {item.topic}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {item.content}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete superseded memory ${item.topic}`}
                  onClick={() => memory.deleteMemory(item.id)}
                  className="text-slate-700 transition hover:text-rose-300"
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
