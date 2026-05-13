"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useParams } from "next/navigation"
import AuthGuard from "@/components/AuthGuard"

export default function PublicProfile() {

  const { id } = useParams()
  const [userData, setUserData] = useState<any>(null)
  console.log("PROFILE ID:", id)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {

    const { data, error } = await supabase
      .from("users")
      .select("username, avatar_url, score, streak, level")
      .eq("id", id)
      .maybeSingle()

      console.log("DATA:", data)
      console.log("ERROR:", error)

    if (error) {
      console.log("FETCH ERROR:", error)
      return
    }

    if (!data) {
      console.log("NO USER FOUND")
      return
    }

    setUserData(data)
  }

  function getLeague(score: number) {
    if (score >= 5000) return "Diamond"
    if (score >= 3000) return "Platinum"
    if (score >= 1500) return "Gold"
    if (score >= 700) return "Silver"
    return "Bronze"
  }

  if (!userData) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>User not found or still loading...</p>
      </main>
    )
  }

  const league = getLeague(userData.score || 0)

  return (
  <AuthGuard>
  <main className="
    min-h-screen
    bg-[#f5f5f5] dark:bg-black
    text-black dark:text-white
    flex justify-center
    px-4 py-8
  ">

    <div className="w-full max-w-md">

      {/* HEADER */}
      <div className="mb-6">

        <p className="text-xs uppercase tracking-[3px] text-yellow-500 mb-2">
          Public Profile
        </p>

        <h1 className="text-3xl font-bold">
          {userData.username}
        </h1>

      </div>

      {/* MAIN CARD */}
      <div className="
        relative overflow-hidden
        rounded-3xl
        border border-gray-200 dark:border-yellow-500/20
        bg-white dark:bg-[#0d0d0d]
        shadow-xl
      ">

        {/* GOLD GLOW */}
        <div className="
          absolute inset-0 opacity-20
          bg-[radial-gradient(circle_at_top,_#facc15,_transparent_60%)]
          dark:block hidden
        " />

        <div className="relative z-10 p-6">

          {/* PROFILE */}
          <div className="flex items-center gap-4">

            <img
              src={userData.avatar_url || "/default.png"}
              className="
                w-24 h-24 rounded-full object-cover
                border-4 border-yellow-500
                shadow-[0_0_25px_rgba(250,204,21,0.35)]
              "
            />

            <div className="flex-1">

              <h2 className="text-2xl font-bold">
                {userData.username}
              </h2>

              <div className="flex flex-wrap gap-2 mt-3">

                {/* LEAGUE */}
                <span className="
                  px-3 py-1 rounded-full
                  text-xs font-semibold
                  bg-yellow-100 text-yellow-700
                  dark:bg-yellow-500/10 dark:text-yellow-400
                  border border-yellow-200 dark:border-yellow-500/20
                ">
                  {league} League
                </span>

                {/* LEVEL */}
                <span className="
                  px-3 py-1 rounded-full
                  text-xs font-semibold
                  bg-blue-100 text-blue-700
                  dark:bg-white/10 dark:text-white
                  border border-blue-200 dark:border-white/10
                ">
                  {userData.level}
                </span>

              </div>

            </div>

          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-3 mt-8">

            {/* SCORE */}
            <div className="
              rounded-2xl p-4 text-center
              bg-gray-100 dark:bg-white/5
              border border-gray-200 dark:border-white/10
            ">

              <p className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">
                {userData.score || 0}
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tracking-wide">
                SCORE
              </p>

            </div>

            {/* STREAK */}
            <div className="
              rounded-2xl p-4 text-center
              bg-gray-100 dark:bg-white/5
              border border-gray-200 dark:border-white/10
            ">

              <p className="text-2xl font-bold text-orange-500">
                🔥 {userData.streak || 0}
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tracking-wide">
                STREAK
              </p>

            </div>

            {/* IDENTITY */}
            <div className="
              rounded-2xl p-4 text-center
              bg-gray-100 dark:bg-white/5
              border border-gray-200 dark:border-white/10
            ">

              <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {userData.level}
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tracking-wide">
                IDENTITY
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>

  </main>
  </AuthGuard>
)
}