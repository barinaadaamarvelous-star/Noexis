"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Notification = {
  id: string
  message: string
  created_at: string
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    let interval: any

    async function start() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      await fetchNotifications(user.id)

      // 🔥 POLLING FIX
      interval = setInterval(() => {
        fetchNotifications(user.id)
      }, 5000)
    }

    start()

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  async function fetchNotifications(userId: string) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    setNotifications(data || [])
  }

  return (
    <div className="relative">

      {/* 🔔 Bell */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-2xl"
      >
        🔔

        {notifications.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
            {notifications.length}
          </span>
        )}
      </button>

      {/* 📬 PANEL */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1a1a1a] text-white shadow-xl rounded-xl border border-gray-700 z-50">

          <div className="p-3 font-bold border-b border-gray-700">
            Notifications
          </div>

          <div className="max-h-96 overflow-y-auto">

            {notifications.length === 0 && (
              <p className="p-3 text-gray-400">
                No notifications yet
              </p>
            )}

            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 border-b border-gray-800 hover:bg-gray-800"
              >
                {n.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
