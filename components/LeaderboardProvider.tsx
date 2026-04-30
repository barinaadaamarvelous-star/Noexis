"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useLeaderboardWatcher } from "@/hooks/useLeaderboardWatcher"
import { playSound } from "@/lib/sounds"

type LeaderboardContextType = {
  leaders: any[]
  currentUser: any
  myRank: number | null
}

const LeaderboardContext = createContext<LeaderboardContextType | null>(null)

export function useLeaderboard() {
  return useContext(LeaderboardContext)
}

export default function LeaderboardProvider({ children }: any) {
  const [leaders, setLeaders] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [myRank, setMyRank] = useState<number | null>(null)

  const [notification, setNotification] = useState<string | null>(null)
  const [notifications, setNotifications] = useState(true)

  // ✅ LOAD SETTINGS SAFELY
  useEffect(() => {
    const enabled = localStorage.getItem("notifications") !== "false"
    setNotifications(enabled)
  }, [])

  function safePlay(type: "pass" | "overtaken" | "default") {
    const enabled = localStorage.getItem("notifications") !== "false"
    if (!enabled) return

    const volume = Number(localStorage.getItem("volume") || 0.25)
    playSound(type, volume)
  }

  async function sendNotification(message: string) {
  if (!currentUser) return

  // ✅ PREVENT DUPLICATE (global level)
  const last = localStorage.getItem("lastNotification")

  if (last === message) return

  localStorage.setItem("lastNotification", message)

  // ✅ SAVE TO DB
  await supabase.from("notifications").insert({
    user_id: currentUser.id,
    message,
    created_at: new Date().toISOString(),
  })

  // ✅ PUSH
  await fetch("/api/send-notification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: currentUser.id,
      message,
    }),
  })
}

  // ✅ FETCH EVERYTHING
  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: me } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    setCurrentUser(me)

    const { data: leadersData } = await supabase
      .from("users")
      .select("*")
      .order("score", { ascending: false })

    const list = leadersData || []
    setLeaders(list)

    const rank = list.findIndex((u) => u.id === user.id) + 1
    setMyRank(rank)
  }

  // ✅ INITIAL LOAD
  useEffect(() => {
    fetchData()
  }, [])

  // ✅ SINGLE REALTIME SUBSCRIPTION (FIXED)
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ✅ GLOBAL LOGIC (THIS IS THE MAGIC)
  useLeaderboardWatcher({
    currentUser,
    leaders,
    myRank,
    notifications,
    safePlay,
    setNotification,
    sendNotification,
  })

  return (
    <LeaderboardContext.Provider
      value={{ leaders, currentUser, myRank }}
    >
      {children}

      {/* 🔔 GLOBAL POPUP */}
      {notification && (
        <div className="fixed bottom-5 right-5 bg-black text-white px-4 py-2 rounded shadow-lg z-50">
          {notification}
        </div>
      )}
    </LeaderboardContext.Provider>
  )
}