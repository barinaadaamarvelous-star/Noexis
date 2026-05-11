"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Notification = {
  id: string
  message: string
  created_at: string
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // 🔊 MAIN SOUND
  const soundRef = useRef<HTMLAudioElement | null>(null)

  // 🏆 LEADERBOARD SOUND
  const battleSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchNotifications()

    soundRef.current = new Audio(
      "https://notificationsounds.com/storage/sounds/file-sounds-1151-pristine.mp3"
    )

    battleSoundRef.current = new Audio(
      "https://notificationsounds.com/storage/sounds/file-sounds-1101-plucky.mp3"
    )

    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload: any) => {
          const newNotification = payload.new

          setNotifications((prev) => [
            newNotification,
            ...prev,
          ])

          // 🔥 PLAY SOUNDS
          const msg = newNotification.message || ""

          const isBattle =
            msg.includes("passed") ||
            msg.includes("beat") ||
            msg.includes("Rival")

          try {
            if (isBattle) {
              battleSoundRef.current?.play()
            } else {
              soundRef.current?.play()
            }
          } catch (err) {
            console.log("sound blocked")
          }

          // 📳 BROWSER POPUP
          if (Notification.permission === "granted") {
            new Notification("Noexis ⚡", {
              body: msg,
              icon: "/icon-192x192.png",
            })
          }
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
      {/* 🔔 BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="text-xl"
      >
        🔔
      </button>

      {/* 📬 DROPDOWN */}
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
                className="p-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800"
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