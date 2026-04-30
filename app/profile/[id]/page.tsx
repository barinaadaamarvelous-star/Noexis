"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useParams } from "next/navigation"

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
    <main className="min-h-screen bg-white flex justify-center p-6">

      <div className="w-full max-w-md bg-gray-100 p-6 rounded-xl shadow-md">

        {/* HEADER */}
        <div className="flex items-center gap-4">

          <img
            src={userData.avatar_url || "/default.png"}
            className="w-20 h-20 rounded-full object-cover border"
          />

          <div>
            <h1 className="text-xl font-semibold">
              {userData.username}
            </h1>

            <div className="flex gap-2 mt-1">

              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm">
                {league} League
              </span>

              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-sm">
                {userData.level}
              </span>

            </div>
          </div>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">

          <div>
            <p className="font-bold text-lg">{userData.score}</p>
            <p className="text-sm text-gray-600">Score</p>
          </div>

          <div>
            <p className="font-bold text-lg">{userData.streak}</p>
            <p className="text-sm text-gray-600">Streak</p>
          </div>

          <div>
            <p className="font-bold text-lg">{userData.level}</p>
            <p className="text-sm text-gray-600">Identity</p>
          </div>

        </div>

      </div>

    </main>
  )
}