import {
  FaBrain,
  FaDatabase,
  FaInfoCircle,
  FaPalette,
  FaTrophy,
  FaUser,
} from "react-icons/fa";

import { useApp } from "../context/AppContext";
import { useXP } from "../context/XPContext";

import { STORAGE_KEYS } from "../constants/storage";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

function Settings() {
  const {
    profile,
    updateProfile,
  } = useApp();

  const {
    totalXP,
    level,
  } = useXP();

  function saveProfile() {
    alert(
      "Profile updated successfully!"
    );
  }

  // ==========================================
  // DEVELOPMENT DATA RESET
  // ==========================================
  //
  // Removes only the domains we are currently
  // rebuilding/testing.
  //
  // DOES NOT delete:
  // - Profile
  // - Habits
  // - Captures
  // - Goals
  // - Monthly planning
  // - Weekly planning
  //
  // ==========================================

  function resetTestActivity() {
    const confirmed =
      confirm(
        "Reset task, XP, and execution-history test data?\n\nYour profile, goals, habits, captures, and planning data will be preserved."
      );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      STORAGE_KEYS.TASKS
    );

    localStorage.removeItem(
      STORAGE_KEYS.EXECUTION_HISTORY
    );

    

    location.reload();
  }

  return (
    <div className="space-y-10">

      <PageHero
        badge="System Control"
        title="Settings"
        description="Configure your LifeOS experience, identity, and local system data."
      >
        <Card className="border-cyan-500/20 bg-cyan-500/5">

          <p className="text-sm uppercase tracking-widest text-cyan-300">
            LifeOS
          </p>

          <h2 className="mt-3 text-5xl font-black">
            v1.0
          </h2>

          <p className="mt-3 text-slate-400">
            System Control
          </p>

        </Card>
      </PageHero>

      {/* ====================================== */}
      {/* System Overview */}
      {/* ====================================== */}

      <div className="grid gap-6 md:grid-cols-4">

        <StatCard
          icon={
            <FaUser />
          }
          title="Profile"
          value={
            profile.name ||
            "Unknown"
          }
        />

        <StatCard
          icon={
            <FaBrain />
          }
          title="ATLAS"
          value={
            profile.atlasPersonality
          }
          color="text-cyan-400"
        />

        <StatCard
          icon={
            <FaTrophy />
          }
          title="Level"
          value={
            level.toString()
          }
          color="text-yellow-400"
        />

        <StatCard
          icon={
            <FaDatabase />
          }
          title="XP"
          value={
            totalXP.toString()
          }
          color="text-green-400"
        />

      </div>

      {/* ====================================== */}
      {/* Profile */}
      {/* ====================================== */}

      <Card>

        <div className="mb-8 flex items-center gap-3">

          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
            <FaUser
              size={22}
            />
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
              value={
                profile.name
              }
              onChange={(
                event
              ) =>
                updateProfile({
                  name:
                    event.target
                      .value,
                })
              }
              placeholder="Enter your name"
            />

          </div>

          <div>

            <p className="mb-2 text-sm font-medium">
              Occupation
            </p>

            <Input
              value={
                profile.occupation
              }
              onChange={(
                event
              ) =>
                updateProfile({
                  occupation:
                    event.target
                      .value,
                })
              }
              placeholder="Student, Engineer, Designer..."
            />

          </div>

          <div>

            <p className="mb-2 text-sm font-medium">
              Time Zone
            </p>

            <Input
              value={
                profile.timezone
              }
              onChange={(
                event
              ) =>
                updateProfile({
                  timezone:
                    event.target
                      .value,
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
              value={
                profile.atlasPersonality
              }
              onChange={(
                event
              ) =>
                updateProfile({
                  atlasPersonality:
                    event.target
                      .value as
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
              value={
                profile.theme
              }
              onChange={(
                event
              ) =>
                updateProfile({
                  theme:
                    event.target
                      .value as
                      | "dark"
                      | "light",
                })
              }
            >
              <option value="dark">
                Dark
              </option>

              <option value="light">
                Light
              </option>
            </select>

          </div>

          {/* Real XP */}

          <div className="grid gap-4 md:grid-cols-2">

            <Card>

              <p className="text-sm text-slate-400">
                Current Level
              </p>

              <h2 className="mt-2 text-4xl font-black text-yellow-400">
                {level}
              </h2>

            </Card>

            <Card>

              <p className="text-sm text-slate-400">
                Total XP
              </p>

              <h2 className="mt-2 text-4xl font-black text-green-400">
                {totalXP}
              </h2>

            </Card>

          </div>

          <Button
            onClick={
              saveProfile
            }
          >
            Save Profile
          </Button>

        </div>

      </Card>

      {/* ====================================== */}
      {/* Data Management */}
      {/* ====================================== */}

      <Card>

        <div className="mb-6 flex items-center gap-3">

          <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
            <FaDatabase
              size={22}
            />
          </div>

          <div>

            <h2 className="text-2xl font-bold">
              Development Data
            </h2>

            <p className="text-sm text-slate-400">
              Clean temporary task and progression test data without deleting your LifeOS identity or planning system.
            </p>

          </div>

        </div>

        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-6">

          <h3 className="font-semibold text-white">
            Reset Task Test Data
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Removes current tasks, execution history, and XP so we can test the new unified task architecture from a clean state. Your profile, goals, monthly plans, weekly plans, habits, and captures are preserved.
          </p>

          <Button
            variant="danger"
            onClick={
              resetTestActivity
            }
            className="mt-5"
          >
            Reset Task Test Data
          </Button>

        </div>

      </Card>

      {/* ====================================== */}
      {/* About */}
      {/* ====================================== */}

      <Card>

        <div className="mb-6 flex items-center gap-3">

          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
            <FaInfoCircle
              size={22}
            />
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