"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import BottomNav from "@/components/BottomNav"
import AuthGuard from "@/components/AuthGuard"

export default function TasksPage() {

  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState<any[]>([])

  const [activeTask, setActiveTask] = useState<any>(null)

  const [seconds, setSeconds] = useState(0)

  const [running, setRunning] = useState(false)

  const [difficulty, setDifficulty] =
    useState("medium")

  const [message, setMessage] = useState("")

  // LOAD TASKS
  useEffect(() => {
    fetchTasks()
  }, [])

  // TIMER
  useEffect(() => {

    let interval: NodeJS.Timeout

    if (running) {

      interval = setInterval(() => {

        setSeconds(prev => prev + 1)

      }, 1000)
    }

    return () => clearInterval(interval)

  }, [running])

  async function fetchTasks() {

    try {

      setLoading(true)

      const { data: { user } } =
        await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)

      setTasks(data || [])

    } catch (err) {

      console.error(err)

    } finally {

      setLoading(false)
    }
  }

  function startTask(task: any) {

    setActiveTask(task)

    setSeconds(0)

    setRunning(true)

    setMessage("⚡ Focus session started.")
  }

  function pauseTask() {
    setRunning(false)
  }

  function resumeTask() {
    setRunning(true)
  }

  async function stopTask() {

    setRunning(false)

    const minutes = Math.floor(seconds / 60)

    if (seconds < 20) {

      setMessage("⏱️ Session too short. No reward.")

      setActiveTask(null)

      return
    }

    const { data: { user } } =
      await supabase.auth.getUser()

    if (!user || !activeTask) return

    await supabase.from("task_logs").insert([
      {
        task_id: activeTask.id,
        user_id: user.id,
        completed_at: new Date().toISOString(),
        duration: seconds,
        difficulty: difficulty
      }
    ])

    function generateReward(
      minutes: number,
      difficulty: string
    ) {

      const rewards = [
        "⚡ Momentum building...",
        "🔥 You're locked in.",
        "🚀 Elite focus session.",
        "💎 Discipline upgraded.",
        "🧠 Deep work completed."
      ]

      let multiplier = 1

      if (difficulty === "medium")
        multiplier = 1.5

      if (difficulty === "hard")
        multiplier = 2

      const xp = Math.floor(
        minutes * 10 * multiplier
      )

      return {
        xp,
        message:
          rewards[
            Math.floor(
              Math.random() * rewards.length
            )
          ]
      }
    }

    const {
      xp,
      message: rewardMessage
    } = generateReward(
      minutes,
      difficulty
    )

    const { data: xpData, error: xpError } =
      await supabase.rpc(
        "increment_score",
        {
          user_id_input: user.id,
          points: xp,
        }
      )

    console.log("XP RESULT:", xpData)
    console.log("XP ERROR:", xpError)

    if (xpError) {
      console.error("❌ XP FAILED:", xpError)
    }

    setMessage(
      `${rewardMessage} (+${xp} XP)`
    )

    try {

      const ctx = new (
        window.AudioContext ||
        (window as any).webkitAudioContext
      )()

      const osc = ctx.createOscillator()

      const gain = ctx.createGain()

      osc.frequency.value = 700

      gain.gain.value = 0.05

      osc.connect(gain)

      gain.connect(ctx.destination)

      osc.start()

      osc.stop(ctx.currentTime + 0.15)

    } catch (err) {
      console.log(err)
    }

    setActiveTask(null)
  }

  function formatTime(totalSeconds: number) {

    const hours = Math.floor(totalSeconds / 3600)

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    )

    const secs = totalSeconds % 60

    if (hours > 0) {

      return `${hours}:${minutes
        .toString()
        .padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`
    }

    return `${minutes}:${secs
      .toString()
      .padStart(2, "0")}`
  }

  const progress =
    ((seconds % 3600) / 3600) * 100

  if (loading) {

    return (

      <main className="min-h-screen bg-[#050505] p-6">

        <div className="animate-pulse space-y-5 max-w-5xl mx-auto">

          <div className="h-12 w-72 rounded-3xl bg-gray-800"></div>

          <div className="h-40 rounded-[40px] bg-gray-800"></div>

          <div className="h-32 rounded-[40px] bg-gray-800"></div>

          <div className="h-32 rounded-[40px] bg-gray-800"></div>

        </div>

      </main>
    )
  }

  return (

    <AuthGuard>

      <main className="
  min-h-screen
  bg-[#f5f5f5]
  dark:bg-[#050505]
  text-black
  dark:text-white
  pb-32
  overflow-hidden
  relative
">

        {/* BACKGROUND GLOW */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">

          <div className="
            absolute
            top-[-120px]
            left-[-120px]
            w-[420px]
            h-[420px]
            bg-yellow-500/10
            blur-3xl
            rounded-full
            animate-pulse
          " />

          <div className="
            absolute
            bottom-[-150px]
            right-[-100px]
            w-[380px]
            h-[380px]
            bg-yellow-400/10
            blur-3xl
            rounded-full
            animate-pulse
          " />

        </div>

        <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-6">

          {/* HEADER */}
          {!activeTask && (

            <div className="mb-10">

              <p className="
                uppercase
                tracking-[0.35em]
                text-yellow-400
                text-xs
                font-black
              ">
                FOCUS CHAMBER
              </p>

              <h1 className="
                text-4xl
                md:text-6xl
                font-black
                mt-4
                leading-tight
              ">
                Lock in. <br />
                Build momentum daily.
              </h1>

              <p className="
                mt-5
                text-gray-400
                text-lg
                max-w-2xl
              ">
                Every focus session pushes you higher.
              </p>

            </div>

          )}

          {/* XP CARD */}
          {!activeTask && (

            <div className="
              mb-8
              rounded-[32px]
              border
              border-yellow-500/20
              bg-white/5
              backdrop-blur-2xl
              p-6
              overflow-hidden
              relative
            ">

              <div className="
                absolute
                inset-0
                bg-gradient-to-r
                from-yellow-500/5
                to-transparent
              " />

              <div className="relative z-10">

                <p className="
                  text-yellow-400
                  text-sm
                  font-black
                  tracking-wide
                ">
                  LIVE PROGRESSION
                </p>

                <h2 className="
                  text-3xl
                  font-black
                  mt-2
                ">
                  +12 Focus XP
                </h2>

                <p className="
                  text-gray-400
                  mt-2
                ">
                  You're getting closer to the next rank.
                </p>

              </div>

            </div>

          )}

          {/* ACTIVE FOCUS MODE */}
          {activeTask && (

            <div className="
              rounded-[42px]
              border
              border-yellow-500/20
              bg-[#0d0d0d]/95
              backdrop-blur-3xl
              p-6
              md:p-12
              shadow-[0_0_80px_rgba(255,204,0,0.08)]
              transition-all
              duration-500
              mb-10
            ">

              <div className="text-center">

                <p className="
                  uppercase
                  tracking-[0.35em]
                  text-yellow-400
                  text-xs
                  font-black
                ">
                  IN FOCUS MODE
                </p>

                <h2 className="
                  text-4xl
                  md:text-6xl
                  font-black
                  mt-6
                ">
                  {activeTask.title}
                </h2>

                {/* TIMER RING */}
                <div className="
                  flex
                  justify-center
                  mt-14
                ">

                  <div className="
                    relative
                    w-[280px]
                    h-[280px]
                  ">

                    <svg
                      className="
                        absolute
                        inset-0
                        rotate-[-90deg]
                      "
                      width="280"
                      height="280"
                    >

                      <circle
                        cx="140"
                        cy="140"
                        r="120"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="14"
                        fill="none"
                      />

                      <circle
                        cx="140"
                        cy="140"
                        r="120"
                        stroke="#facc15"
                        strokeWidth="14"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={754}
                        strokeDashoffset={
                          754 - (754 * progress) / 100
                        }
                        style={{
                          transition:
                            "stroke-dashoffset 1s linear"
                        }}
                      />

                    </svg>

                    <div className="
                      absolute
                      inset-0
                      flex
                      flex-col
                      items-center
                      justify-center
                    ">

                      <p className="
                        text-6xl
                        md:text-7xl
                        font-black
                        tracking-wider
                      ">
                        {formatTime(seconds)}
                      </p>

                      <p className="
                        mt-4
                        text-yellow-300
                        text-sm
                      ">
                        Stay locked in.
                      </p>

                    </div>

                  </div>

                </div>

                {/* QUOTE */}
                <p className="
                  mt-10
                  text-gray-500
                  italic
                  text-lg
                ">
                  "Most people stop here. Keep going."
                </p>

                {/* DIFFICULTY */}
                <div className="mt-8">

                  <select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value)
                    }
                    className="
                      px-5
                      py-3
                      rounded-2xl
                      bg-black
                      border
                      border-yellow-500/20
                      text-white
                      outline-none
                    "
                  >
                    <option value="easy">
                      Easy
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="hard">
                      Hard
                    </option>

                  </select>

                </div>

                {/* BUTTONS */}
                <div className="
                  flex
                  flex-wrap
                  justify-center
                  gap-4
                  mt-10
                ">

                  {running ? (

                    <button
                      onClick={pauseTask}
                      className="
                        px-8
                        py-4
                        rounded-2xl
                        bg-yellow-500
                        hover:bg-yellow-400
                        text-black
                        font-black
                        transition
                        hover:scale-105
                      "
                    >
                      Pause
                    </button>

                  ) : (

                    <button
                      onClick={resumeTask}
                      className="
                        px-8
                        py-4
                        rounded-2xl
                        bg-yellow-500
                        hover:bg-yellow-400
                        text-black
                        font-black
                        transition
                        hover:scale-105
                      "
                    >
                      Resume
                    </button>

                  )}

                  <button
                    onClick={stopTask}
                    className="
                      px-8
                      py-4
                      rounded-2xl
                      bg-red-500
                      hover:bg-red-400
                      text-white
                      font-black
                      transition
                      hover:scale-105
                    "
                  >
                    End Session
                  </button>

                </div>

              </div>

            </div>

          )}

          {/* REWARD */}
          {message && (

            <div className="
              mb-8
              rounded-[28px]
              border
              border-yellow-500/20
              bg-gradient-to-r
              from-yellow-500/10
              to-transparent
              p-5
              animate-pulse
            ">

              <p className="
                text-center
                font-black
                text-lg
              ">
                {message}
              </p>

            </div>

          )}

          {/* TASKS */}
          {!activeTask && (

            <div className="space-y-5">

              {tasks.map((task, i) => (

                <button
                  key={task.id}
                  onClick={() => startTask(task)}
                  className="
                    group
                    w-full
                    text-left
                    rounded-[34px]
                    border
                    border-white/10
                    bg-white/5
                    backdrop-blur-2xl
                    p-6
                    md:p-8
                    hover:border-yellow-500/30
                    hover:bg-white/[0.07]
                    transition-all
                    duration-300
                    hover:scale-[1.015]
                    overflow-hidden
                    relative
                  "
                >

                  <div className="
                    absolute
                    inset-0
                    opacity-0
                    group-hover:opacity-100
                    transition
                    bg-gradient-to-r
                    from-yellow-500/5
                    to-transparent
                  " />

                  <div className="
                    relative
                    z-10
                    flex
                    flex-col
                    md:flex-row
                    md:items-center
                    md:justify-between
                    gap-6
                  ">

                    <div className="
                      flex
                      items-center
                      gap-4
                    ">

                      <div className="
                        w-14
                        h-14
                        rounded-2xl
                        bg-yellow-500/10
                        border
                        border-yellow-500/20
                        flex
                        items-center
                        justify-center
                        text-yellow-400
                        font-black
                        text-lg
                      ">
                        {i + 1}
                      </div>

                      <div>

                        <h2 className="
                          text-2xl
                          font-black
                        ">
                          {task.title}
                        </h2>

                        <p className="
                          mt-2
                          text-gray-400
                        ">
                          Ready for deep focus.
                        </p>

                      </div>

                    </div>

                    {/* TAP TO START */}
                    <div className="
                      px-6
                      py-4
                      rounded-2xl
                      bg-yellow-500
                      text-black
                      font-black
                      shadow-[0_0_30px_rgba(255,204,0,0.25)]
                      group-hover:scale-105
                      transition
                    ">
                      ⚡ Tap To Start
                    </div>

                  </div>

                </button>

              ))}

            </div>

          )}

        </div>

        <BottomNav />

      </main>

    </AuthGuard>
  )
}