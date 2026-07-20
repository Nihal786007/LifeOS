import {
  FaBrain,
  FaDatabase,
  FaInfoCircle,
  FaPalette,
  FaTrophy,
  FaUser,
} from "react-icons/fa";

import { useApp } from "../context/AppContext";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

function Settings() {
  const { profile, updateProfile } = useApp();

  function saveProfile() {
    alert("Profile updated successfully!");
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
        description="Configure your LifeOS command center."
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
          value={profile.name || "Unknown"}
        />

        <StatCard
          icon={<FaBrain />}
          title="ATLAS"
          value={profile.atlasPersonality}
          color="text-cyan-400"
        />

        <StatCard
          icon={<FaTrophy />}
          title="Level"
          value={profile.level.toString()}
          color="text-yellow-400"
        />

        <StatCard
          icon={<FaDatabase />}
          title="XP"
          value={profile.xp.toString()}
          color="text-green-400"
        />
      </div>

      <Card>
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
            <FaUser size={22} />
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              Profile Settings
            </h2>

            <p className="text-sm text-slate-400">
              Personalize your LifeOS experience.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">
              Your Name
            </p>

            <Input
              value={profile.name}
              onChange={(e) =>
                updateProfile({
                  name: e.target.value,
                })
              }
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">
              Occupation
            </p>

            <Input
              value={profile.occupation}
              onChange={(e) =>
                updateProfile({
                  occupation: e.target.value,
                })
              }
              placeholder="Student, Robotics Engineer..."
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">
              Time Zone
            </p>

            <Input
              value={profile.timezone}
              onChange={(e) =>
                updateProfile({
                  timezone: e.target.value,
                })
              }
              placeholder="Asia/Kolkata"
            />
          </div>
                    <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FaBrain />
              ATLAS Personality
            </p>

            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              value={profile.atlasPersonality}
              onChange={(e) =>
                updateProfile({
                  atlasPersonality: e.target.value as
                    | "Professional"
                    | "Friendly"
                    | "Motivational",
                })
              }
            >
              <option value="Professional">
                Professional
              </option>

              <option value="Friendly">
                Friendly
              </option>

              <option value="Motivational">
                Motivational
              </option>
            </select>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FaPalette />
              Theme
            </p>

            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              value={profile.theme}
              onChange={(e) =>
                updateProfile({
                  theme: e.target.value as "dark" | "light",
                })
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <p className="text-sm text-slate-400">
                Current Level
              </p>

              <h2 className="mt-2 text-4xl font-black text-yellow-400">
                {profile.level}
              </h2>
            </Card>

            <Card>
              <p className="text-sm text-slate-400">
                Current XP
              </p>

              <h2 className="mt-2 text-4xl font-black text-green-400">
                {profile.xp}
              </h2>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button onClick={saveProfile}>
              Save Profile
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

      <Card>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
            <FaInfoCircle size={22} />
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              About LifeOS
            </h2>

            <p className="text-sm text-slate-400">
              Current system information.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <p className="text-sm text-slate-400">
              Version
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              v1.0
            </h2>
          </Card>

          <Card>
            <p className="text-sm text-slate-400">
              Storage
            </p>

            <h2 className="mt-2 text-3xl font-bold text-green-400">
              Local Storage
            </h2>
          </Card>
        </div>
      </Card>
    </div>
  );
}

export default Settings;