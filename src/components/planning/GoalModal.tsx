import { useState } from "react";

import Button from "../ui/Button";
import Card from "../ui/Card";

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (
    title: string,
    description: string,
    targetDate?: string
  ) => void;
}

export default function GoalModal({
  open,
  onClose,
  onCreate,
}: GoalModalProps) {
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [targetDate, setTargetDate] =
    useState("");

  if (!open) return null;

  function handleCreate() {
    if (!title.trim()) return;

    onCreate(
      title.trim(),
      description.trim(),
      targetDate || undefined
    );

    setTitle("");
    setDescription("");
    setTargetDate("");

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      <Card className="w-full max-w-xl border border-cyan-500/20 bg-slate-900">

        <div className="p-8 space-y-6">

          <div>

            <h2 className="text-3xl font-bold">
              🎯 New Life Goal
            </h2>

            <p className="mt-2 text-slate-400">
              Create a long-term goal that LifeOS
              will help you achieve.
            </p>

          </div>

          <div>

            <label className="text-sm text-slate-400">
              Goal Title
            </label>

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-500"
              placeholder="Get into MIT"
            />

          </div>

          <div>

            <label className="text-sm text-slate-400">
              Description (Optional)
            </label>

            <textarea
              rows={4}
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-500"
              placeholder="Example: Prepare for Fall 2027 admission..."
            />

          </div>

          <div>

            <label className="text-sm text-slate-400">
              Target Date (Optional)
            </label>

            <input
              type="date"
              value={targetDate}
              onChange={(e) =>
                setTargetDate(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-500"
            />

          </div>

          <div className="flex justify-end gap-4">

            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              onClick={handleCreate}
            >
              Create Goal
            </Button>

          </div>

        </div>

      </Card>

    </div>
  );
}