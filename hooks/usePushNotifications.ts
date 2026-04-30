"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

// 🔑 Convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export function usePushNotifications() {
  useEffect(() => {
    async function init() {
      console.log("🔥 usePushNotifications started")

      try {
        // 1️⃣ Service worker check
        if (!("serviceWorker" in navigator)) {
          console.log("❌ No service worker support")
          return
        }

        // 2️⃣ Permission
        const permission = await Notification.requestPermission()
        console.log("🔔 Permission result:", permission)

        if (permission !== "granted") {
          console.log("❌ Permission not granted")
          return
        }

        // 🚀 Register service worker FIRST
          const reg = await navigator.serviceWorker.register("/sw.js")
          console.log("📡 Service worker registered:", reg)

        // then wait for it to be ready
        await navigator.serviceWorker.ready
        console.log("✅ Service worker ready")
        // 4️⃣ Remove old subscription
        const existingSub = await reg.pushManager.getSubscription()
        if (existingSub) {
          await existingSub.unsubscribe()
          console.log("🧹 Old subscription cleared")
        } else {
          console.log("ℹ️ No existing subscription")
        }

        // 5️⃣ Convert VAPID key
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        console.log("🔑 VAPID key length:", vapidKey?.length)

        const convertedKey = urlBase64ToUint8Array(vapidKey)

        // 6️⃣ Subscribe
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        })

        console.log("📲 New subscription created:", sub)

        // 7️⃣ Get user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        console.log("👤 Current user:", user)

        if (userError) {
          console.error("❌ User fetch error:", userError)
        }

        if (!user) {
          console.log("❌ No user logged in → cannot save subscription")
          return
        }

        // 8️⃣ Save to DB
        const { data, error } = await supabase
  .from("push_subscriptions")
  .upsert(
    {
      user_id: user.id,
      subscription: sub,
    },
    {
      onConflict: "user_id",
    }
  )
        if (error) {
          console.error("❌ Supabase insert error:", error)
        } else {
          console.log("✅ Push subscription saved")
        }
      } catch (err) {
        console.error("❌ Push setup error:", err)
      }
    }

    init()
  }, [])
}