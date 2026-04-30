"use client"

import { useRouter } from "next/navigation"
import { Home, CheckSquare, Calendar, Trophy, User } from "lucide-react"

export default function BottomNav() {
  const router = useRouter()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-900 flex justify-around p-2">
      <button onClick={() => router.push("/home")}><Home /></button>
      <button onClick={() => router.push("/tasks")}><CheckSquare /></button>
      <button onClick={() => router.push("/calendar")}><Calendar /></button>
      <button onClick={() => router.push("/leaderboard")}><Trophy /></button>
      <button onClick={() => router.push("/profile")}><User /></button>
    </div>
  )
}