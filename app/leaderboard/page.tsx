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
      <main className="min-h-screen bg-white dark:bg-black p-6 flex justify-center text-black dark:text-white">

        <div className="w-full max-w-md">

          <h1 className="text-2xl font-bold mb-6">
            Leaderboard
          </h1>

          {/* 🧍 YOUR RANK */}
          {currentUser && (
            <div className="mb-6 p-4 bg-white dark:bg-[#000] border border-gray-300 dark:border-gray-700 rounded-md">
              <p className="text-xs text-gray-500">Your Rank</p>
              <p className="text-3xl font-semibold">
                #{myRank || "—"}
              </p>
            </div>
          )}

          {/* 🏆 LIST */}
          {leaders.map((user, i) => {
            const isMe = currentUser?.id === user.id

            return (
              <motion.div
                key={user.id}
                layout
                onClick={() => router.push(`/profile/${user.id}`)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer
                  ${
                    isMe
                      ? "bg-blue-100 dark:bg-blue-900 border border-blue-400"
                      : "bg-gray-100 dark:bg-[#1a1a1a]"
                  }`}
              >
                <div className="flex items-center gap-3">

                  <span className={`font-bold ${getRankColor(i)}`}>
                    #{i + 1}
                  </span>

                  <img
                    src={user.avatar_url || "/default.png"}
                    className="w-10 h-10 rounded-full object-cover"
                  />

                  <span>{user.username}</span>
                </div>

                {isMe && (
                  <span className="text-xs text-blue-500 font-bold">
                    You
                  </span>
                )}

                <span className="font-bold">{user.score}</span>
              </motion.div>
            )
          })}

        </div>

        <BottomNav />
      </main>
    </AuthGuard>
  )
}