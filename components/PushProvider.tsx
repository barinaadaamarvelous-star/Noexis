"use client"

import { usePushNotifications } from "@/hooks/usePushNotifications"

export default function PushProvider() {
  console.log("🚀 PushProvider mounted")

  usePushNotifications()

  return null
}