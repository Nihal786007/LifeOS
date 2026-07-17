import { useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaTrash,
  FaFlag,
  FaChevronRight,
  FaRegCircle,
} from "react-icons/fa";

import { useApp } from "../context/AppContext";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

export default function Tasks() {
  const [task, setTask] = useState("");
  const [search, setSearch] = useState("");

  const {
    tasks,
    addTask,
    deleteTask,
    toggleTask,
    completedTasks,
  } = useApp();

  const remaining = tasks.length - completedTasks;

  const filteredTasks = tasks.filter((item) =>
    item.text.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddTask = () => {
    if (!task.trim()) return;

    addTask(task.trim());
    setTask("");
  };

  return (
    <div className="space-y-10">

      <PageHero
        badge="Mission Planner"
        title="Tasks"
        description="Organize your missions, stay focused, and execute every objective with precision."
      >
        <Card className="border-cyan-500/20 bg-cyan-500/5">

          <p className="text-sm uppercase tracking-widest text-cyan-300">
            Today's Progress
          </p>

          <h2 className="mt-3 text-5xl font-black">
            {completedTasks}/{tasks.length}
          </h2>

          <p className="mt-3 text-slate-400">
            Missions Completed
          </p>

        </Card>
      </PageHero>

      <div className="grid gap-6 md:grid-cols-3">

        <StatCard
          icon={<FaTasks />}
          title="Total Tasks"
          value={tasks.length}
        />

        <StatCard
          icon={<FaCheckCircle />}
          title="Completed"
          value={completedTasks}
          color="text-green-400"
        />

        <StatCard
          icon={<FaClock />}
          title="Remaining"
          value={remaining}
          color="text-orange-400"
        />

      </div>

      <div className="relative">

        <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search missions..."
          className="py-5 pl-14 pr-6 text-lg"
        />

      </div>

      <div className="flex flex-col gap-4 lg:flex-row">

        <Input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddTask();
            }
          }}
          placeholder="Create a new mission..."
          className="flex-1 px-6 py-5 text-lg"
        />

        <Button
          onClick={handleAddTask}
          className="px-8 py-5"
        >
          <FaPlus />
          New Mission
        </Button>

      </div>

      {/* Task List Starts Here */}
            <div className="space-y-5">

        {filteredTasks.length === 0 ? (

          <Card className="border-dashed border-slate-700 bg-slate-900/50 p-14 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/10">
              <FaCheckCircle className="text-4xl text-cyan-400" />
            </div>

            <h2 className="mt-6 text-3xl font-bold">
              All Missions Complete
            </h2>

            <p className="mt-4 text-slate-400">
              Great work! There are no active missions right now.
            </p>

          </Card>

        ) : (

          filteredTasks.map((item) => (

            <Card
              key={item.id}
              className="group p-7 hover:-translate-y-1"
            >

              <div className="flex items-start justify-between">

                <div
                  onClick={() => toggleTask(item.id)}
                  className="flex cursor-pointer gap-5"
                >

                  <div className="mt-1 text-2xl">

                    {item.completed ? (
                      <FaCheckCircle className="text-green-400" />
                    ) : (
                      <FaRegCircle className="text-slate-500 transition-colors group-hover:text-cyan-400" />
                    )}

                  </div>

                  <div>

                    <h2
                      className={`text-2xl font-bold transition ${
                        item.completed
                          ? "line-through text-slate-500"
                          : "text-white"
                      }`}
                    >
                      {item.text}
                    </h2>

                    <div className="mt-4 flex flex-wrap items-center gap-3">

                      <span className="rounded-full bg-cyan-500/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">
                        Personal Mission
                      </span>

                      <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-red-300">
                        <FaFlag />
                        High Priority
                      </span>

                    </div>

                  </div>

                </div>

                <Button
                  variant="danger"
                  onClick={() => deleteTask(item.id)}
                  className="rounded-2xl p-4"
                >
                  <FaTrash />
                </Button>

              </div>

              <div className="mt-7 flex items-center justify-between border-t border-slate-800 pt-5">

                <div className="flex items-center gap-3 text-sm text-slate-400">

                  <FaChevronRight />

                  {item.completed
                    ? "Mission Completed"
                    : "Ready to Execute"}

                </div>

                                <Button
                  variant="secondary"
                  onClick={() => toggleTask(item.id)}
                  className="px-5 py-2 text-sm"
                >
                  {item.completed ? "Completed" : "Complete"}
                </Button>

              </div>

            </Card>

          ))

        )}

      </div>

    </div>
  );
}