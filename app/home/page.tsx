"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import BottomNav from "@/components/BottomNav"
import AuthGuard from "@/components/AuthGuard"


export default function Home() {

 const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [leaders, setLeaders] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("General")

  const [completedToday, setCompletedToday] = useState(0)
  const [weeklyTasks, setWeeklyTasks] = useState(0)
  const [weeklyActiveDays, setWeeklyActiveDays] = useState(0)

  const [futureTasks, setFutureTasks] = useState(0)
  const [futureDays, setFutureDays] = useState(0)

  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [level, setLevel] = useState("Beginner")
  const [chainWarning, setChainWarning] = useState(false)

  const [behavior, setBehavior] = useState("")
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("")
  const [remindBefore, setRemindBefore] = useState(3)

  // 🔥 TIME
  const [todaySeconds, setTodaySeconds] = useState(0)
  const [weeklySeconds, setWeeklySeconds] = useState(0)

  function formatHours(sec: number) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${h}h ${m}m`
  }

  async function fetchTasks() {

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

    setCompletedToday(completedTodaySet.size)

    const tasksToday = completedTodaySet.size
    setFutureTasks(tasksToday * 365)
    setFutureDays(tasksToday > 0 ? 365 : 0)

    const { data: allLogs } = await supabase
      .from("task_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })

    const now = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(now.getDate() - 7)

    const weeklyLogs = allLogs?.filter(log =>
      new Date(log.completed_at) >= weekAgo
    ) || []

    setWeeklyTasks(weeklyLogs.length)

    const uniqueWeekDays = new Set(
      weeklyLogs.map(log =>
        new Date(log.completed_at).toDateString()
      )
    )

    setWeeklyActiveDays(uniqueWeekDays.size)

    // 🔥 TIME CALC
    let todaySec = 0
    let weekSec = 0

    allLogs?.forEach(log => {
      const d = new Date(log.completed_at)

      if (d >= startOfToday) todaySec += log.duration || 0
      if (d >= weekAgo) weekSec += log.duration || 0
    })

    setTodaySeconds(todaySec)
    setWeeklySeconds(weekSec)

    // 🔥 STREAK
    let currentStreak = 0

    if (allLogs?.length) {
      const uniqueDays = [
        ...new Set(
          allLogs.map(log =>
            new Date(log.completed_at).toISOString().split("T")[0]
          )
        )
      ]

      uniqueDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

      let today = new Date()
      today.setHours(0,0,0,0)

      for (let i = 0; i < uniqueDays.length; i++) {
        const d = new Date(uniqueDays[i])
        d.setHours(0,0,0,0)

        const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)

        if (diff === i) currentStreak++
        else break
      }
    }

    setStreak(currentStreak)
    setChainWarning(completedTodaySet.size === 0 && currentStreak > 0)

    const saved = Number(localStorage.getItem("longestStreak") || 0)

    if (currentStreak > saved) {
      localStorage.setItem("longestStreak", String(currentStreak))
      setLongestStreak(currentStreak)
    } else {
      setLongestStreak(saved)
    }

    let newLevel = "Beginner"
    if (currentStreak >= 30) newLevel = "Discipline Master"
    else if (currentStreak >= 14) newLevel = "Relentless"
    else if (currentStreak >= 7) newLevel = "Focused"
    else if (currentStreak >= 3) newLevel = "Builder"

    setLevel(newLevel)

    await supabase
      .from("users")
      .update({ level: newLevel, streak: currentStreak })
      .eq("id", user.id)

    const formattedTasks = tasksData?.map(task => ({
      ...task,
      completedToday: completedTodaySet.has(task.id)
    }))

    setTasks(formattedTasks || [])
  }

  async function fetchLeaders() {
    const { data } = await supabase
      .from("users")
      .select("username, score, avatar_url")
      .order("score", { ascending: false })
      .limit(5)

    setLeaders(data || [])
  }
   async function saveIntention() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data, error } = await supabase
    .from("intentions")
    .insert({
      user_id: user.id,
      behavior,
      time,
      location,
      remind_before: remindBefore
    })
    .select()

  console.log("RESULT:", data)
  console.log("ERROR:", error)

  if (error) {
    alert("❌ Failed to save")
    return
  }

  alert(`🔥 Plan locked:
"I will ${behavior} at ${time} in ${location}"`)

  // optional: reset form (clean UX)
  setBehavior("")
  setTime("")
  setLocation("")
  setRemindBefore(3)
}
  async function createTask() {
    if (!title) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("tasks").insert([{
      title,
      category,
      user_id: user.id
    }])

    setTitle("")
    fetchTasks()
  }

  async function completeTask(taskId: string) {

    const today = new Date().toISOString().split("T")[0]

    const { data: existing } = await supabase
      .from("task_logs")
      .select("*")
      .eq("task_id", taskId)
      .gte("completed_at", today)

    if (existing && existing.length > 0) return

    const { data: { user } } = await supabase.auth.getUser()
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

    const newScore = (currentUser?.score || 0) + 10

    await supabase
      .from("users")
      .update({ score: newScore })
      .eq("id", user.id)

    await supabase.rpc("add_xp", {
      user_id_input: user.id,
      xp_amount: 15
    })

    fetchTasks()
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
      setLoading(false) // ✅ ALWAYS runs
    }
  }

  init()
 }, [])

  const groupedTasks = tasks.reduce((acc: any, task) => {
    const cat = task.category || "General"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(task)
    return acc
  }, {})

  function getRealityMessage() {
    if (weeklyActiveDays === 7) return "You're operating at full consistency."
    if (weeklyActiveDays >= 5) return "You're consistent, but improve."
    if (weeklyActiveDays >= 3) return "You're trying, but not consistent yet."
    return "You're not consistent yet."
  }
  if (loading) {
  return (
    <main className="min-h-screen p-6 bg-white dark:bg-black">
      <div className="animate-pulse space-y-4">
        
        <div className="h-8 w-40 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="space-y-2">
          <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>

      </div>
    </main>
  )
 }
  return (
     <AuthGuard>
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-24">

      <div className="p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Task System 🚀</h1>

        {/* 🔥 TIME */}
        <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-2">Focus Time</h2>
          <p className="text-green-400">⏱ Today: {formatHours(todaySeconds)}</p>
          <p className="text-blue-400 mt-2">📈 7 Days: {formatHours(weeklySeconds)}</p>
        </div>

        {/* STREAK */}
        <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-lg mb-8">
          <h2>Current Streak</h2>
          <p className="text-3xl">🔥 {streak}</p>
        </div>
        {chainWarning && (
            <div className="bg-red-500 text-white p-4 rounded mb-6 animate-pulse">
                ⚠️ Don’t break your streak. Do 1 task now.
            </div>
         )}

        {/* TASK INPUT */}
        <div className="flex gap-3 mb-6">
          <input value={title} onChange={e=>setTitle(e.target.value)} className="px-3 py-2 rounded bg-white dark:bg-gray-800 text-black dark:text-white" />
          <button onClick={createTask} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Add</button>
        </div>
        <div className="bg-white dark:bg-[#242526] p-5 rounded-xl shadow-md border">

  <h2 className="font-semibold text-lg mb-4">🎯 Today's Plan</h2>

  <div className="space-y-3 text-sm">

    <div>
      I will
      <input
        value={behavior}
        onChange={(e) => setBehavior(e.target.value)}
        className="ml-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
        placeholder="run"
      />
    </div>

    <div>
      at
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="ml-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
      />
    </div>

    <div>
      in
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="ml-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
        placeholder="the field"
      />
    </div>

    <div className="flex items-center gap-2 mt-3">
      ⏰ Remind me
      <select
        value={remindBefore}
        onChange={(e) => setRemindBefore(Number(e.target.value))}
        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
      >
        <option value={1}>1 min before</option>
        <option value={3}>3 min before</option>
        <option value={5}>5 min before</option>
      </select>
    </div>

    <button
      onClick={saveIntention}
      className="w-full mt-4 bg-blue-500 text-white py-2 rounded"
    >
      Save Intention
    </button>

  </div>
</div>

        {/* TASKS */}
        {Object.entries(groupedTasks).map(([cat, list]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-xl mb-2">{cat}</h2>
            {(list as any[]).map(task => (
              <div
                key={task.id}
                onClick={() => completeTask(task.id)}
                className="p-3 rounded mb-2 cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {task.title}
              </div>
            ))}
          </div>
        ))}

      </div>
      

      {/* NAV (UNCHANGED) */}
       
      <BottomNav />

    </main>
    </AuthGuard>
  )
}