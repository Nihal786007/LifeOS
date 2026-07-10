import { useEffect, useState } from "react";

function Settings() {
  const [name, setName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("lifeos-name");

    if (saved) {
      setName(saved);
    }
  }, []);

  function saveName() {
    localStorage.setItem("lifeos-name", name);
    alert("Name saved successfully!");
  }

  function resetData() {
    if (confirm("Delete all LifeOS data?")) {
      localStorage.clear();
      location.reload();
    }
  }

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-4xl font-bold">⚙️ Settings</h1>

        <p className="mt-2 text-slate-400">
          Customize your LifeOS experience.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900 p-6">

        <h2 className="text-xl font-bold mb-4">
          👤 Your Name
        </h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          className="w-full rounded-xl bg-slate-800 p-3 outline-none"
        />

        <button
          onClick={saveName}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-3 hover:bg-blue-700"
        >
          Save Name
        </button>

      </div>

      <div className="rounded-2xl bg-slate-900 p-6">

        <h2 className="text-xl font-bold mb-4">
          🗑 Reset Application
        </h2>

        <button
          onClick={resetData}
          className="rounded-xl bg-red-600 px-5 py-3 hover:bg-red-700"
        >
          Delete All Data
        </button>

      </div>

      <div className="rounded-2xl bg-slate-900 p-6">

        <h2 className="text-xl font-bold">
          🚀 LifeOS Version
        </h2>

        <p className="mt-2 text-slate-400">
          Version 1.0.0
        </p>

      </div>

    </div>
  );
}

export default Settings;