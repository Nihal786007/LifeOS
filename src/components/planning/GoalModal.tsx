import { useState } from "react";

import Button from "../ui/Button";
import Modal from "../ui/Modal";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [targetDate, setTargetDate] =
    useState("");

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
    <Modal
      open={open}
      title="🎯 New Life Goal"
      description="Create a long-term goal that LifeOS will help you achieve."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button onClick={handleCreate}>
            Create Goal
          </Button>
        </>
      }
    >
      <div>
        <label className="text-sm text-slate-400">
          Goal Title
        </label>

        <input
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          placeholder="Get into MIT"
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-500"
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
            setDescription(e.target.value)
          }
          placeholder="Example: Prepare for Fall 2027 admission..."
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-500"
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
            setTargetDate(e.target.value)
          }
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-500"
        />
      </div>
    </Modal>
  );
}