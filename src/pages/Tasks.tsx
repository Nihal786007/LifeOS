import TaskSection from "../components/tasks/TaskSection";
import EmptyState from "../components/tasks/EmptyState";
import { useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaTasks,
  FaCheckCircle,
  FaClock,
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
  console.log(tasks);

  const remaining = tasks.length - completedTasks;

 const filteredTasks = tasks.filter((item) =>
  (item.title ?? "")
    .toLowerCase()
    .includes(search.toLowerCase())
);
const today = new Date().toISOString().split("T")[0];

const overdueTasks = filteredTasks.filter(
  (task) =>
    !task.completed &&
    task.dueDate &&
    task.dueDate < today
);

const todayTasks = filteredTasks.filter(
  (task) =>
    !task.completed &&
    task.dueDate === today
);

const upcomingTasks = filteredTasks.filter(
  (task) =>
    !task.completed &&
    task.dueDate &&
    task.dueDate > today
);

const completedTaskList = filteredTasks.filter(
  (task) => task.completed
);

console.log("All tasks:", tasks);
console.log("Filtered:", filteredTasks);
console.log("Today:", todayTasks);

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

      
            
                    {/* Task Sections */}

      <div className="space-y-10">
        {filteredTasks.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <TaskSection
              title="🔴 Overdue"
              tasks={overdueTasks}
              toggleTask={toggleTask}
              deleteTask={deleteTask}
            />

            <TaskSection
              title="🟢 Today"
              tasks={todayTasks}
              toggleTask={toggleTask}
              deleteTask={deleteTask}
            />

            <TaskSection
              title="🟡 Upcoming"
              tasks={upcomingTasks}
              toggleTask={toggleTask}
              deleteTask={deleteTask}
            />

            <TaskSection
              title="⚪ Completed"
              tasks={completedTaskList}
              toggleTask={toggleTask}
              deleteTask={deleteTask}
            />
          </>
        )}
      </div>
    </div>
  );
}