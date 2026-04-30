"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import BottomNav from "@/components/BottomNav"
import AuthGuard from "@/components/AuthGuard"

export default function TasksPage() {

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [intentions, setIntentions] = useState<any[]>([])
  const [activeTask, setActiveTask] = useState<any>(null)
  const [seconds, setSeconds] = useState(0)
  const [notifications, setNotifications] = useState(true)
  const [running, setRunning] = useState(false)
  const [difficulty, setDifficulty] = useState("medium")
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchTasks()
    fetchIntentions()
  }, [])

  // ⏱ TIMER
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (running) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [running])

  async function fetchIntentions() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase
    .from("intentions")
    .select("*")
    .eq("user_id", user.id)
    .order("time", { ascending: true })

  setIntentions(data || [])
}
async function deleteIntention(id: string) {
  await supabase.from("intentions").delete().eq("id", id)
  fetchIntentions()
}

  async function fetchTasks() {
  try {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)

    setTasks(data || [])
  } catch (err) {
    console.error(err)
  } finally {
    setLoading(false) // ✅ THIS makes skeleton disappear
  }
 }

  function startTask(task: any) {
    setActiveTask(task)
    setSeconds(0)
    setRunning(true)
    setMessage("")
    setMessage("⚡ You started. Stay locked in.")
  }

  function generateReward(minutes: number, difficulty: string) {

    const rewards = [
      "⚡ Momentum building...",
      "💪 Strong discipline.",
      "🔥 You're locked in.",
      "🚀 Elite focus session.",
      "🧠 Brain upgraded.",
      "🏆 You're ahead of 90%."
    ]

    const rareRewards = [
      "💎 RARE: Discipline Beast",
      "👑 LEGEND: Unstoppable",
      "⚔️ Warrior Mode Activated"
    ]

    let message = rewards[Math.floor(Math.random() * rewards.length)]

    if (Math.random() < 0.1 && minutes >= 10) {
      message = rareRewards[Math.floor(Math.random() * rareRewards.length)]
    }

    let multiplier = 1
    if (difficulty === "hard") multiplier = 2
    if (difficulty === "medium") multiplier = 1.5

    const xp = Math.floor(minutes * 10 * multiplier)

    return { message, xp }
  }

  function playRewardSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

  const o1 = ctx.createOscillator()
  const o2 = ctx.createOscillator()
  const gain = ctx.createGain()

  o1.frequency.value = 600
  o2.frequency.value = 900

  o1.type = "sine"
  o2.type = "triangle"

  gain.gain.value = 0.15

  o1.connect(gain)
  o2.connect(gain)
  gain.connect(ctx.destination)

  o1.start()
  o2.start()

  o1.stop(ctx.currentTime + 0.15)
  o2.stop(ctx.currentTime + 0.15)
  }

  async function stopTask() {
    setRunning(false)

    const minutes = Math.floor(seconds / 60)

    // ❌ Prevent useless logs
    if (seconds < 20) {
      setMessage("⏱️ Session too short. No reward.")
      setActiveTask(null)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !activeTask) return

    // ✅ SAVE LOG (FIXED DATE FORMAT)
    await supabase.from("task_logs").insert([
      {
        task_id: activeTask.id,
        user_id: user.id,
        completed_at: new Date().toISOString(), // 🔥 IMPORTANT FIX
        duration: seconds,
        difficulty: difficulty
      }
    ])

    // 🎯 REWARD
    const { message: rewardMessage, xp } = generateReward(minutes, difficulty)

    let finalMessage = `${rewardMessage} (+${xp} XP)`

    // 🔥 STREAK PROTECTION
    if (minutes >= 5) {
      finalMessage += " 🛡️ Streak Protected"
    }

    setMessage(finalMessage)


    // 🔊 SOUND (NEW)
     if (notifications) {
     playRewardSound()
    }

    // 🎯 GIVE XP
    await supabase.rpc("increment_score", {
      user_id_input: user.id,
      points: xp
    })

    setActiveTask(null)
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }
  if (loading) {
  return (
    <main className="min-h-screen p-6 bg-white dark:bg-black">
      <div className="animate-pulse space-y-4">

        <div className="h-8 w-40 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>

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
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-6 pb-24">

      <h1 className="text-2xl font-bold mb-6">
        🎯 Focus Mode
      </h1>
       
       <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded mb-6">
  <h2 className="font-bold mb-2">📅 Today's Intentions</h2>

  {intentions.length === 0 && (
    <p className="text-sm opacity-70">No plan yet</p>
  )}

 {intentions.map((i) => (
  <div key={i.id} className="flex justify-between items-center mb-2 text-sm">
    
    <div>
      ⏰ {i.time} — I will <b>{i.behavior}</b> in {i.location}
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => deleteIntention(i.id)}
        className="text-red-500"
      >
        ❌
      </button>
    </div>

  </div>
))}
</div>
      {/* ACTIVE TASK */}
      {activeTask && (
        <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded mb-6 text-center">

          <h2 className="text-xl mb-2">
            {activeTask.title}
          </h2>

          <p className="text-4xl font-bold mb-4">
            {formatTime(seconds)}
          </p>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 rounded mb-4 bg-white dark:bg-gray-800 text-black dark:text-white"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <br />

          <button
            onClick={stopTask}
            className="bg-red-500 px-6 py-2 rounded font-bold"
          >
            Stop
          </button>

        </div>
      )}

      {/* 🔥 REWARD */}
      {message && (
        <div className="bg-gradient-to-r from-green-400 to-emerald-600 dark:from-green-500 dark:to-emerald-700 p-6 rounded mb-6 text-center animate-pulse">
          <p className="text-lg font-bold">
            {message}
          </p>
        </div>
      )}
      <button
  onClick={() => {
    if (tasks.length > 0) {
      startTask(tasks[0]) // auto pick first task
    }
  }}
  className="w-full mb-4 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700"
>
  ⚡ Start Focus (1 Tap)
</button>

      {/* TASK LIST */}
      <div className="space-y-4">

        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => startTask(task)}
           className={`w-full p-4 rounded text-left transition
            ${running 
             ? "opacity-50 cursor-not-allowed" 
            : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"}
           `}
          >
            {task.title}
          </button>
        ))}
      </div>
      <BottomNav />
    </main>
    </AuthGuard>
  )
}