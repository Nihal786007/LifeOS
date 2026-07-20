import { useEffect, useState } from "react";
import {
  FaUser,
  FaDatabase,
  FaInfoCircle,
  FaCog,
} from "react-icons/fa";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

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
    <div className="space-y-10">
      <PageHero
        badge="System Control"
        title="Settings"
        description="Configure your LifeOS experience and personalize your command center."
      >
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <p className="text-sm uppercase tracking-widest text-cyan-300">
            LifeOS
          </p>

          <h2 className="mt-3 text-5xl font-black">
            v1.0
          </h2>

          <p className="mt-3 text-slate-400">
            Mission Control
          </p>
        </Card>
      </PageHero>

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          icon={<FaUser />}
          title="Profile"
          value="Ready"
        />

        <StatCard
          icon={<FaCog />}
          title="Settings"
          value="Active"
          color="text-cyan-400"
        />

        <StatCard
          icon={<FaDatabase />}
          title="Storage"
          value="Local"
          color="text-green-400"
        />

        <StatCard
          icon={<FaInfoCircle />}
          title="Version"
          value="1.0"
          color="text-orange-400"
        />
      </div>

     <Card>
  <h2 className="mb-6 text-xl font-bold">
    Profile Settings
  </h2>
        <div className="space-y-4">
          <div>
  <p className="mb-2 text-sm font-medium">
    Your Name
  </p>

  <Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Enter your name"
  />
</div>

          <div className="flex gap-3">
            <Button onClick={saveName}>
              Save Name
            </Button>

            <Button
              variant="danger"
              onClick={resetData}
            >
              Reset Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Settings;