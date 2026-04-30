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
    fetchNotifications()

    // 🔥 realtime updates
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    setNotifications(data || [])
  }

  return (
    <div className="relative">

      {/* 🔔 Bell Button */}
      <button onClick={() => setOpen(!open)} className="text-xl">
        🔔
      </button>

      {/* 🔴 Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1a] shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 z-50">

          <div className="p-3 font-bold border-b border-gray-200 dark:border-gray-700">
            Notifications
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-3 text-sm text-gray-500">
                No notifications yet
              </p>
            )}

            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
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