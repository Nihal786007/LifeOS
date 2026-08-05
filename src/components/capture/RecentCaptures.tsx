import {
  FaCopy,
  FaTrash,
} from "react-icons/fa";

import Card from "../ui/Card";

import { useApp } from "../../context/AppContext";

export default function RecentCaptures() {
  const {
    captures,
    deleteCapture,
  } = useApp();

  function formatTime(date: string) {
    const now = new Date();
    const created = new Date(date);

    const diff = Math.floor(
      (now.getTime() - created.getTime()) /
        1000
    );

    if (diff < 60) return "Just now";

    if (diff < 3600)
      return `${Math.floor(
        diff / 60
      )} min ago`;

    if (diff < 86400)
      return `${Math.floor(
        diff / 3600
      )} hr ago`;

    return created.toLocaleDateString();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <Card>

      <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold">

        ⚡ Recent Captures

      </h2>

      {captures.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">

          <div className="text-5xl">
            ⚡
          </div>

          <h3 className="mt-4 text-lg font-bold">

            Nothing captured yet

          </h3>

          <p className="mt-2 text-slate-400">

            Your captured ideas will
            appear here.

          </p>

        </div>
      ) : (
        <div className="space-y-4">

          {captures.map((capture) => (
            <div
              key={capture.id}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-cyan-500"
            >
              <p className="leading-7 text-white">

                {capture.text}

              </p>

              <div className="mt-5 flex items-center justify-between">

                <span className="text-sm text-slate-500">

                  {formatTime(
                    capture.createdAt
                  )}

                </span>

                <div className="flex gap-3">

                  <button
                    onClick={() =>
                      copy(
                        capture.text
                      )
                    }
                    className="rounded-lg bg-slate-800 p-3 transition hover:bg-cyan-600"
                  >
                    <FaCopy />
                  </button>

                  <button
                    onClick={() =>
                      deleteCapture(
                        capture.id
                      )
                    }
                    className="rounded-lg bg-red-600 p-3 transition hover:bg-red-500"
                  >
                    <FaTrash />
                  </button>

                </div>

              </div>

            </div>
          ))}

        </div>
      )}

    </Card>
  );
}