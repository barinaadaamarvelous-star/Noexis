"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import IdentityCard from "./components/IdentityCard";
import DailyProgressCard from "./components/DailyProgressCard";
import StreakCard from "./components/StreakCard";
import TasksCard from "./components/TasksCard";
import RewardsCard from "./components/RewardsCard";
import ShareProgressCard from "./components/ShareProgressCard";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [rewards, setRewards] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      // 1️⃣ Fetch user (hardcode id for now)
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", "YOUR_USER_ID")
        .single();
      setUser(userData);

      // 2️⃣ Fetch tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", "YOUR_USER_ID");
      setTasks(tasksData || []);

      // 3️⃣ Fetch streak
      const { data: streakData } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", "YOUR_USER_ID")
        .single();
      setStreak(streakData);

      // 4️⃣ Fetch rewards
      const { data: rewardsData } = await supabase
        .from("rewards")
        .select("*")
        .eq("user_id", "YOUR_USER_ID")
        .single();
      setRewards(rewardsData);
    }

    fetchData();
  }, []);

  if (!user) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold">Discipline Masters</h1>
          <p className="text-zinc-400 text-sm">
            Proof that you showed up today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <img src={user.avatar_url} className="w-10 h-10 rounded-full" />
          <span className="text-zinc-300">{user.username}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <IdentityCard user={user} />
        <DailyProgressCard tasks={tasks} />
        <StreakCard streak={streak} />
        <TasksCard tasks={tasks} />
        <RewardsCard rewards={rewards} />
        <ShareProgressCard user={user} tasks={tasks} streak={streak} />
      </div>
    </div>
  );
}