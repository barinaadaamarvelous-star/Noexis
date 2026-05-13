"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import BottomNav from "@/components/BottomNav"
import AuthGuard from "@/components/AuthGuard"

export default function Home() {

  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState<any[]>([])
  const [leaders, setLeaders] = useState<any[]>([])

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("General")

  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState("Beginner")

  const [todaySeconds, setTodaySeconds] = useState(0)
  const [weeklySeconds, setWeeklySeconds] = useState(0)

  const [chainWarning, setChainWarning] = useState(false)

  function formatHours(sec: number) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${h}h ${m}m`
  }

  function getLevelStyle(level: string) {
    switch (level) {
      case "Builder":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"

      case "Focused":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"

      case "Relentless":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"

      case "Discipline Master":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"

      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  async function fetchTasks() {

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // USER
    const { data: userData } = await supabase
      .from("users")
      .select("level, streak")
      .eq("id", user.id)
      .single()

    if (userData) {
      setLevel(userData.level || "Beginner")
      setStreak(userData.streak || 0)
    }

    // TASKS
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)

    const startOfToday = new Date()
    startOfToday.setHours(0,0,0,0)

    const { data: logsToday } = await supabase
      .from("task_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", startOfToday.toISOString())

    const completedTodaySet = new Set(
      logsToday?.map(log => log.task_id)
    )

    setChainWarning(
      completedTodaySet.size === 0 &&
      (userData?.streak || 0) > 0
    )

    // ALL LOGS
    const { data: allLogs } = await supabase
      .from("task_logs")
      .select("*")
      .eq("user_id", user.id)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    let todaySec = 0
    let weekSec = 0

    allLogs?.forEach(log => {

      const d = new Date(log.completed_at)

      if (d >= startOfToday)
        todaySec += log.duration || 0

      if (d >= weekAgo)
        weekSec += log.duration || 0
    })

    setTodaySeconds(todaySec)
    setWeeklySeconds(weekSec)

    const formattedTasks = tasksData?.map(task => ({
      ...task,
      completedToday: completedTodaySet.has(task.id)
    }))

    setTasks(formattedTasks || [])
  }

  async function fetchLeaders() {

    const { data } = await supabase
      .from("users")
      .select("username, score, avatar_url, level")
      .order("score", { ascending: false })
      .limit(5)

    setLeaders(data || [])
  }

  async function createTask() {

    if (!title.trim()) return

    const { data: { user } } =
      await supabase.auth.getUser()

    if (!user) return

    await supabase.from("tasks").insert([{
      title,
      category,
      user_id: user.id
    }])

    setTitle("")

    fetchTasks()
  }

  async function deleteTask(taskId: string) {

    await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)

    fetchTasks()
  }

  async function completeTask(taskId: string) {

    const today =
      new Date().toISOString().split("T")[0]

    const { data: existing } = await supabase
      .from("task_logs")
      .select("*")
      .eq("task_id", taskId)
      .gte("completed_at", today)

    if (existing && existing.length > 0) return

    const { data: { user } } =
      await supabase.auth.getUser()

    if (!user) return

    await supabase.from("task_logs").insert([{
      task_id: taskId,
      completed_at: new Date().toISOString(),
      user_id: user.id,
      duration: 60
    }])

    const { data: currentUser } = await supabase
      .from("users")
      .select("score")
      .eq("id", user.id)
      .single()

    const newScore =
      (currentUser?.score || 0) + 10

    await supabase
      .from("users")
      .update({ score: newScore })
      .eq("id", user.id)

    await supabase.rpc("add_xp", {
      user_id_input: user.id,
      xp_amount: 15
    })

    fetchTasks()
    fetchLeaders()
  }

  useEffect(() => {

    async function init() {

      try {

        setLoading(true)

        await Promise.all([
          fetchTasks(),
          fetchLeaders()
        ])

      } catch (err) {

        console.error(err)

      } finally {

        setLoading(false)
      }
    }

    init()

  }, [])

  const groupedTasks = tasks.reduce(
    (acc: any, task) => {

      const cat = task.category || "General"

      if (!acc[cat]) acc[cat] = []

      acc[cat].push(task)

      return acc

    }, {}
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f4f5] dark:bg-[#0f0f10] p-6">

        <div className="animate-pulse space-y-4 max-w-4xl mx-auto">

          <div className="h-12 w-60 rounded-2xl bg-gray-300 dark:bg-gray-800"></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 rounded-3xl bg-gray-300 dark:bg-gray-800"></div>
            <div className="h-32 rounded-3xl bg-gray-300 dark:bg-gray-800"></div>
          </div>

          <div className="h-24 rounded-3xl bg-gray-300 dark:bg-gray-800"></div>

        </div>

      </main>
    )
  }

  return (
    <AuthGuard>

      <main className="min-h-screen bg-[#f4f4f5] dark:bg-[#0f0f10] text-black dark:text-white pb-28">

        <div className="max-w-5xl mx-auto p-4 md:p-6">

          {/* HEADER */}
          <div className="mb-8">

            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Discipline Dashboard
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Your consistency creates your identity.
            </p>

          </div>

          {/* HERO */}
          <div className="rounded-3xl overflow-hidden border border-yellow-300/40 dark:border-yellow-500/20 bg-gradient-to-br from-yellow-100 via-white to-orange-100 dark:from-yellow-900/20 dark:via-[#171717] dark:to-orange-900/20 p-6 md:p-8 mb-8 shadow-xl">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              <div>

                <p className="text-sm uppercase tracking-widest text-yellow-700 dark:text-yellow-400 font-bold">
                  Your Identity
                </p>

                <div className="mt-3 flex items-center gap-3 flex-wrap">

                  <h2 className="text-3xl md:text-4xl font-black">
                    {level}
                  </h2>

                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getLevelStyle(level)}`}>
                    🔥 {streak} Day Streak
                  </span>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">

                <div className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur p-4 border border-yellow-200 dark:border-yellow-800">

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Today
                  </p>

                  <h3 className="text-2xl font-black mt-2">
                    {formatHours(todaySeconds)}
                  </h3>

                </div>

                <div className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur p-4 border border-yellow-200 dark:border-yellow-800">

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    7 Days
                  </p>

                  <h3 className="text-2xl font-black mt-2">
                    {formatHours(weeklySeconds)}
                  </h3>

                </div>

              </div>

            </div>

          </div>

          {/* WARNING */}
          {chainWarning && (
            <div className="mb-6 rounded-2xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 animate-pulse">

              <p className="text-red-700 dark:text-red-300 font-semibold">
                ⚠️ Your streak is in danger. Complete one task now.
              </p>

            </div>
          )}

          {/* CREATE TASK */}
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#171717] p-5 md:p-6 mb-8 shadow-sm">

            <h2 className="text-xl font-bold mb-5">
              Add New Task
            </h2>

            <div className="flex flex-col md:flex-row gap-3">

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task..."
                className="flex-1 h-12 px-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-[#f9f9f9] dark:bg-[#0f0f10] outline-none"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 px-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-[#f9f9f9] dark:bg-[#0f0f10]"
              >
                <option>General</option>
                <option>Work</option>
                <option>Fitness</option>
                <option>Study</option>
              </select>

              <button
                onClick={createTask}
                className="h-12 px-6 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition"
              >
                Add Task
              </button>

            </div>

          </div>

          {/* TASKS */}
          <div className="space-y-8">

            {Object.entries(groupedTasks).map(([cat, list]) => (

              <div key={cat}>

                <h2 className="text-2xl font-bold mb-4">
                  {cat}
                </h2>

                <div className="space-y-4">

                  {(list as any[]).map(task => (

                    <div
                      key={task.id}
                      className={`
                        rounded-3xl border p-5 transition
                        ${task.completedToday
                          ? "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800"
                          : "bg-white dark:bg-[#171717] border-gray-200 dark:border-gray-800"
                        }
                      `}
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <p className="font-bold text-lg">
                            {task.title}
                          </p>

                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {task.completedToday
                              ? "Completed today"
                              : "Tap complete to grow your streak"}
                          </p>

                        </div>

                        <div className="flex gap-2">

                          {!task.completedToday && (
                            <button
                              onClick={() => completeTask(task.id)}
                              className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                            >
                              Complete
                            </button>
                          )}

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            ))}

          </div>

          {/* LEADERBOARD */}
          <div className="mt-10 rounded-3xl overflow-hidden border border-yellow-300/30 dark:border-yellow-700/20 bg-gradient-to-br from-yellow-100 via-white to-orange-100 dark:from-yellow-900/20 dark:via-[#171717] dark:to-orange-900/20 p-6 shadow-xl">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-2xl font-black">
                  🏆 Top Players
                </h2>

                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Discipline leaderboard
                </p>

              </div>

            </div>

            <div className="space-y-4">

              {leaders.map((user, i) => (

                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl bg-white/80 dark:bg-black/30 backdrop-blur border border-white/40 dark:border-white/10 px-4 py-4"
                >

                  <div className="flex items-center gap-4">

                    <div className="w-10 text-center font-black text-yellow-600 dark:text-yellow-400">
                      #{i + 1}
                    </div>

                    <img
                      src={user.avatar_url || "/default.png"}
                      className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"
                    />

                    <div>

                      <p className="font-bold">
                        {user.username}
                      </p>

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.level}
                      </p>

                    </div>

                  </div>

                  <div className="text-right">

                    <p className="font-black text-xl">
                      {user.score}
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      points
                    </p>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </div>

        <BottomNav />

      </main>

    </AuthGuard>
  )
}