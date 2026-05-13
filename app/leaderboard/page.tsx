"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import BottomNav from "@/components/BottomNav"
import AuthGuard from "@/components/AuthGuard"

type UserType = {
  id: string
  username: string
  score: number
  avatar_url?: string
}

export default function Leaderboard() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [leaders, setLeaders] = useState<UserType[]>([])
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)

  // ✅ FETCH DATA (UI ONLY)
  useEffect(() => {
    async function init() {
      try {
        await Promise.all([fetchLeaders(), fetchCurrentUser()])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  async function fetchLeaders() {
    const { data } = await supabase
      .from("users")
      .select("id, username, score, avatar_url")
      .order("score", { ascending: false })
      .order("streak", { ascending: false })

    setLeaders(data || [])
  }

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("users")
      .select("id, username, score, avatar_url")
      .eq("id", user.id)
      .single()

    setCurrentUser(data)
  }

  // ✅ RANK (DISPLAY ONLY)
  const myRank =
    currentUser && leaders.length > 0
      ? leaders.findIndex((u) => u.id === currentUser.id) + 1
      : null

  function getRankColor(rank: number) {
    switch (rank) {
      case 0: return "text-yellow-500"
      case 1: return "text-gray-400"
      case 2: return "text-orange-400"
      default: return "text-white"
    }
  }

  // ⏳ LOADING
  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-white dark:bg-black">
        <div className="animate-pulse space-y-4 max-w-md mx-auto">
          <div className="h-8 w-40 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
      </main>
    )
  }

  return (
  <AuthGuard>
    <main className="min-h-screen transition-colors duration-300
      bg-[#f5f5f5] dark:bg-[#050505]
      text-black dark:text-white
      flex justify-center p-4 pb-24">

      <div className="w-full max-w-2xl">

        {/* 🏆 HEADER */}
        <div
          className="
          relative overflow-hidden
          rounded-3xl
          border border-yellow-500/20
          bg-gradient-to-b
          from-[#1b1408]
          via-[#0f0f0f]
          to-black
          shadow-[0_0_50px_rgba(255,180,0,0.08)]
          p-8 mb-6
        "
        >

          {/* glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,200,80,0.18),transparent_60%)]" />

          <div className="relative z-10 text-center">

            <p className="text-yellow-500 tracking-[6px] text-sm font-medium mb-2">
              ELITE RANKING
            </p>

            <h1
              className="
              text-5xl font-black
              bg-gradient-to-b
              from-yellow-200
              via-yellow-400
              to-yellow-700
              bg-clip-text text-transparent
              drop-shadow-[0_2px_10px_rgba(255,200,0,0.35)]
            "
            >
              LEADERBOARD
            </h1>

            <p className="text-gray-400 mt-3 text-sm">
              Discipline separates the elite.
            </p>
          </div>
        </div>

        {/* 👤 YOUR RANK */}
        {currentUser && (
          <div
            className="
            mb-6 rounded-2xl
            border border-yellow-500/20
            bg-white/70 dark:bg-[#111]/90
            backdrop-blur-xl
            p-5 shadow-xl
          "
          >
            <div className="flex justify-between items-center">

              <div>
                <p className="text-gray-500 text-sm">
                  Your Rank
                </p>

                <h2 className="text-4xl font-black mt-1">
                  #{myRank || "—"}
                </h2>
              </div>

              <div className="text-right">
                <p className="text-gray-500 text-sm">
                  Score
                </p>

                <p className="text-yellow-500 text-2xl font-bold">
                  {currentUser.score}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🏆 LEADERS */}
        <div className="space-y-4">

          {leaders.map((user, i) => {
            const isMe = currentUser?.id === user.id

            return (
              <motion.div
                key={user.id}
                layout
                whileHover={{ scale: 1.015 }}
                transition={{ duration: 0.2 }}
                onClick={() => router.push(`/profile/${user.id}`)}
                className={`
                  relative overflow-hidden
                  rounded-2xl
                  border
                  cursor-pointer
                  transition-all duration-300
                  backdrop-blur-xl
                  shadow-lg

                  ${
                    isMe
                      ? `
                        border-yellow-500/50
                        bg-gradient-to-r
                        from-yellow-500/10
                        to-yellow-700/5
                      `
                      : `
                        border-white/10
                        bg-white/70
                        dark:bg-[#111]/90
                        hover:border-yellow-500/30
                      `
                  }
                `}
              >

                {/* GOLD LINE */}
                {i === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/10" />
                )}

                <div className="relative z-10 flex items-center justify-between p-4">

                  <div className="flex items-center gap-4">

                    {/* RANK */}
                    <div className="w-12 text-center">
                      { i === 0 ? (
  <div className="
    w-10 h-10 rounded-full
    bg-gradient-to-b
    from-yellow-200
    via-yellow-400
    to-yellow-700
    flex items-center justify-center
    shadow-[0_0_18px_rgba(255,215,0,0.35)]
    border border-yellow-300/40
  ">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5 text-black"
    >
      <path d="M5 16L3 5l5.5 4L12 3l3.5 6L21 5l-2 11H5z" />
    </svg>
  </div>

) : i === 1 ? (

  <div className="
    w-10 h-10 rounded-full
    bg-gradient-to-b
    from-gray-200
    via-gray-400
    to-gray-600
    flex items-center justify-center
    border border-gray-300/30
    shadow-lg
    text-black font-bold
  ">
    2
  </div>

) : i === 2 ? (

  <div className="
    w-10 h-10 rounded-full
    bg-gradient-to-b
    from-orange-200
    via-orange-400
    to-orange-700
    flex items-center justify-center
    border border-orange-300/30
    shadow-lg
    text-black font-bold
  ">
    3
  </div>

) : (

  <div className="
    w-10 h-10 rounded-full
    bg-gradient-to-b
    from-slate-200
    via-slate-400
    to-slate-600
    flex items-center justify-center
    border border-slate-300/30
    shadow-lg
    text-black font-bold
  ">
    {i + 1}
  </div>

)
}

                    </div>

                    {/* AVATAR */}
                    <img
                      src={user.avatar_url || "/default.png"}
                      className="
                        w-14 h-14
                        rounded-full
                        object-cover
                        border-2
                        border-yellow-500/30
                        shadow-lg
                      "
                    />

                    {/* USER */}
                    <div>
                      <p className="
                        font-semibold text-lg
                        text-black dark:text-white
                      ">
                        {user.username}
                      </p>

                      {isMe && (
                        <p className="text-yellow-500 text-sm font-medium">
                          YOU
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SCORE */}
                  <div className="text-right">

                    <p className="
                      text-2xl font-black
                      text-yellow-500
                    ">
                      {user.score}
                    </p>

                    <p className="text-xs text-gray-500 tracking-widest">
                      SCORE
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>

      <BottomNav />
    </main>
  </AuthGuard>
)
}