"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import BottomNav from "@/components/BottomNav"
import AuthGuard from "@/components/AuthGuard"
import { playSound } from "@/lib/sounds"

export default function MyProfile() {
  const [userData, setUserData] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [achievements, setAchievements] = useState<any[]>([])
  const [theme, setTheme] = useState<"light" | "dark">("light")

  // NEW STATES
  const [openSettings, setOpenSettings] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [volume, setVolume] = useState(0.25)
  const [notificationsList, setNotificationsList] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
  fetchProfile()

  // THEME
  const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null

  if (savedTheme) {
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
  }

  // ✅ CLOSE ALL MENUS (avatar + dropdown)
  const closeMenus = () => {
    setShowAvatarMenu(false)
    setShowDropdown(false) // 👈 ADD THIS LINE
  }

  window.addEventListener("click", closeMenus)

  // 🔔 REALTIME NOTIFICATIONS
  const channel = supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        console.log("NEW NOTIFICATION:", payload)
        const newData = payload.new as any

        if (newData.user_id === userData?.id) {
        fetchNotifications(newData.user_id)
     }
      }
    )
    .subscribe()

  return () => {
    window.removeEventListener("click", closeMenus)
    supabase.removeChannel(channel)
  }
 }, []) // 👈 keep this separate

 // 🔊 SAVE VOLUME (NEW EFFECT)
useEffect(() => {
  localStorage.setItem("volume", volume.toString())
}, [volume])

useEffect(() => {
  localStorage.setItem("notifications", String(notifications))
}, [notifications])

  function toggleTheme() {
  const newTheme = theme === "light" ? "dark" : "light"
  setTheme(newTheme)

  if (newTheme === "dark") {
    document.documentElement.classList.add("dark")
   } else {
    document.documentElement.classList.remove("dark")
   }
  localStorage.setItem("theme", newTheme)
  }

  function getNextLevelXP(level: string) {
    switch (level) {
      case "Beginner": return 50
      case "Builder": return 150
      case "Focused": return 300
      case "Relentless": return 600
      default: return 1000
    }
  }

  function getLeague(score: number) {
    if (score >= 5000) return "Diamond"
    if (score >= 3000) return "Platinum"
    if (score >= 1500) return "Gold"
    if (score >= 700) return "Silver"
    return "Bronze"
  }

  function getLeagueStyle(league: string) {
    switch (league) {
      case "Diamond": return "bg-cyan-100 text-cyan-700"
      case "Platinum": return "bg-gray-200 text-gray-700"
      case "Gold": return "bg-yellow-100 text-yellow-700"
      case "Silver": return "bg-gray-100 text-gray-600"
      default: return "bg-orange-100 text-orange-700"
    }
  }

  function getLevelStyle(level: string) {
    switch (level) {
      case "Builder": return "bg-blue-100 text-blue-600"
      case "Focused": return "bg-green-100 text-green-700"
      case "Relentless": return "bg-red-100 text-red-700"
      case "Discipline Master": return "bg-purple-100 text-purple-700"
      default: return "bg-gray-200 text-gray-700"
    }
  }
  function getIdentityMessage(level: string) {
  switch (level) {
    case "Builder":
      return "You're no longer starting. You're building discipline 🧱"
    case "Focused":
      return "Focus is becoming your default state 🎯"
    case "Relentless":
      return "You don’t stop anymore. This is who you are 🔥"
    case "Discipline Master":
      return "You’ve become dangerous. Elite level unlocked 👑"
    default:
      return "You are evolving."
  }
}

  async function fetchAchievements(userId: string) {
    const { data } = await supabase
      .from("user_achievements")
      .select(`
        unlocked_at,
        achievements (title, description)
      `)
      .eq("user_id", userId)

    setAchievements(data || [])
  }

   async function fetchProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // GET USER
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (!data) return

  // DEFAULT USERNAME
  if (!data.username || data.username.trim() === "") {
    const defaultName = "User" + Math.floor(Math.random() * 10000)

    await supabase
      .from("users")
      .update({ username: defaultName })
      .eq("id", user.id)

    data.username = defaultName
  }

  // 🔥 LEVEL FIX (CRITICAL)
  const xp = data.xp || 0
  let newLevel = "Beginner"

  if (xp >= 600) newLevel = "Discipline Master"
  else if (xp >= 300) newLevel = "Relentless"
  else if (xp >= 150) newLevel = "Focused"
  else if (xp >= 50) newLevel = "Builder"

  const lastLevel = localStorage.getItem("lastLevel")

if (newLevel !== data.level && lastLevel !== newLevel) {

  await supabase
    .from("users")
    .update({ level: newLevel })
    .eq("id", user.id)

  data.level = newLevel

  const message = `⚡ ${getIdentityMessage(newLevel)}`

  // ✅ SAVE TO DB
  await supabase.from("notifications").insert({
    user_id: user.id,
    message,
  })

  // ✅ REMEMBER LEVEL (PREVENT REPEAT)
  localStorage.setItem("lastLevel", newLevel)

  // ✅ SOUND
  if (notifications) {
    const volume = Number(localStorage.getItem("volume") || 0.25)
    playSound("pass", volume)
  }

  // ✅ PUSH
  await fetch("/api/send-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.id,
      message,
    }),
  })

  // ✅ Local popup (instant feedback)
  setTimeout(() => {
    alert(message) // you can replace with premium toast later
  }, 300)
}

  // 🔥 STREAK FIX (YOUR ORIGINAL LOGIC RESTORED)
  const { data: logs } = await supabase
    .from("task_logs")
    .select("completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })

  let currentStreak = 0

  if (logs && logs.length > 0) {
    const uniqueDays = [
      ...new Set(
        logs.map(log =>
          new Date(log.completed_at).toISOString().split("T")[0]
        )
      )
    ]

    uniqueDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let today = new Date()
    today.setHours(0,0,0,0)

    for (let i = 0; i < uniqueDays.length; i++) {
      const logDate = new Date(uniqueDays[i])
      logDate.setHours(0,0,0,0)

      const diff =
        (today.getTime() - logDate.getTime()) /
        (1000 * 60 * 60 * 24)

      if (diff === i) {
        currentStreak++
      } else {
        break
      }
    }
  }

  console.log("Calculated streak:", currentStreak)
   setStreak(currentStreak)
   // 🧠 STREAK NOTIFICATIONS
const lastStreak = userData?.streak || 0

// 🟢 milestone (every 3 days)
if (currentStreak > 0 && currentStreak % 3 === 0 && currentStreak !== lastStreak) {
  const message = `🔥 ${currentStreak} day streak! Keep going!`

  await supabase.from("notifications").insert({
    user_id: user.id,
    message,
  })

  await fetch("/api/send-notification", {
    method: "POST",
    body: JSON.stringify({
      userId: user.id,
      message,
    }),
  })
}

// 🟡 encouragement (small boost)
if (currentStreak > lastStreak && currentStreak < 3) {
  const message = `Nice! You're on a ${currentStreak} day streak 💪`

  await supabase.from("notifications").insert({
    user_id: user.id,
    message,
  })
}

// 🔴 warning (if streak might break tomorrow)
if (currentStreak > 0) {
  const lastLog = logs?.[0]

  if (lastLog) {
    const lastDate = new Date(lastLog.completed_at)
    const today = new Date()

    const diff =
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)

    if (diff >= 1) {
      const message = `⚠️ Don't break your ${currentStreak} day streak!`

      await supabase.from("notifications").insert({
        user_id: user.id,
        message,
      })
    }
  }
 }

  await supabase
    .from("users")
    .update({ streak: currentStreak })
    .eq("id", user.id)

  // SAVE DATA
  setUserData(data)
  setUsername(data.username)

  // NOTIFICATIONS
  setNotifications(data.notifications ?? true)

  await fetchAchievements(user.id)
  await fetchNotifications(user.id)
}

  async function saveUsername() {
    if (!username.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from("users")
      .update({ username: username.trim() })
      .eq("id", user.id)

    setUserData((prev: any) => ({
      ...prev,
      username: username.trim()
    }))

    setEditingName(false)
  }
  async function fetchNotifications(userId: string) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  setNotificationsList(data || [])

    const unread = data?.filter(n => !n.read).length || 0
    setUnreadCount(unread)

  }
  async function markNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)

  setUnreadCount(0)
}
  async function uploadAvatar(file: File) {
  setLoading(true)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // ✅ DELETE OLD IMAGE
  if (userData?.avatar_url) {
    const oldPath = userData.avatar_url
      .split("/avatars/")[1]
      .split("?")[0]

    await supabase.storage
      .from("avatars")
      .remove([oldPath])
  }

  // ✅ UPLOAD NEW IMAGE
  const filePath = `${user.id}/${Date.now()}.png`

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file)

  if (error) {
    console.error(error)
    setLoading(false)
    return
  }

  // ✅ GET PUBLIC URL
  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath)

  const imageUrl = data.publicUrl

  // ✅ SAVE TO DB
  await supabase
    .from("users")
    .update({ avatar_url: imageUrl })
    .eq("id", user.id)

  // ✅ UPDATE UI
  setUserData((prev: any) => ({
    ...prev,
    avatar_url: imageUrl
  }))

  setLoading(false)
 }
  async function deleteAvatar() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const filePath = `${user.id}/avatar.png`

  const { error } = await supabase.storage
    .from("avatars")
    .remove([filePath])

  if (error) {
    console.error("DELETE ERROR:", error.message)
    return
  }

  await supabase
    .from("users")
    .update({ avatar_url: null })
    .eq("id", user.id)

  setUserData((prev: any) => ({
    ...prev,
    avatar_url: null
  }))
}
 

  if (!userData) {
  return (
    <main className="min-h-screen p-6 bg-[#f0f2f5] dark:bg-[#18191a]">
      <div className="animate-pulse space-y-4 max-w-md mx-auto">
        
        <div className="h-20 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>

        <div className="h-6 w-40 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>

      </div>
    </main>
  )
  }

  const xp = userData.xp || 0
  const level = userData.level || "Beginner"
  const maxXP = getNextLevelXP(level)
  const progress = Math.min((xp / maxXP) * 100, 100)
  const league = getLeague(userData.score || 0)

  return (
    <AuthGuard>
    <main className="min-h-screen bg-[#f0f2f5] dark:bg-[#18191a] p-6 flex justify-center items-start">

      <div className="absolute top-4 right-4 flex items-center gap-3">
        <div className="relative">
  <button
    onClick={(e) => {
      e.stopPropagation()
      setShowDropdown(!showDropdown)
    }}
    className="text-xl relative"
  >
    🔔
  </button>

  {/* 🔴 BADGE */}
  {unreadCount > 0 && (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
      {unreadCount}
    </span>
  )}

  {/* 🔽 PREMIUM DROPDOWN */}
  <div
    onClick={(e) => e.stopPropagation()}
    className={`absolute right-0 mt-3 w-80 
      transform transition-all duration-300 ease-out
      ${showDropdown 
  ? "opacity-100 scale-100 translate-y-0" 
  : "opacity-0 scale-95 -translate-y-4 pointer-events-none"}
      bg-white text-black 
      dark:bg-[#242526] dark:text-white 
      border border-gray-200 dark:border-gray-700 
      rounded-xl shadow-2xl z-50 overflow-hidden`}
  >

    {/* HEADER */}
    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
  <h2 className="font-semibold text-lg">Notifications</h2>

  <button
    onClick={async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)

      setNotificationsList(prev =>
        prev.map(n => ({ ...n, read: true }))
      )

      setUnreadCount(0)
    }}
    className="text-xs text-blue-500 hover:underline"
  >
    Mark all as read
  </button>
</div>

    {/* LIST */}
    <div className="max-h-80 overflow-y-auto">

  {/* 🟢 NEW */}
  {notificationsList.filter(n => !n.read).length > 0 && (
    <>
      <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
        New
      </p>

      {notificationsList
        .filter(n => !n.read)
        .map((n, i) => (
          <div
            key={i}
            onClick={async () => {
              await supabase
                .from("notifications")
                .update({ read: true })
                .eq("id", n.id)

              setNotificationsList(prev =>
                prev.map(item =>
                  item.id === n.id ? { ...item, read: true } : item
                )
              )
            }}
            className="px-4 py-3 text-sm cursor-pointer
              bg-blue-100 dark:bg-blue-900
              hover:bg-blue-200 dark:hover:bg-blue-800
              transition"
          >
            {n.message}
          </div>
        ))}
    </>
  )}

  {/* ⚪ OLD */}
  {notificationsList.filter(n => n.read).length > 0 && (
    <>
      <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
        Earlier
      </p>

      {notificationsList
        .filter(n => n.read)
        .map((n, i) => (
          <div
            key={i}
            className="px-4 py-3 text-sm cursor-pointer
              bg-gray-100 dark:bg-[#2a2a2a]
              hover:bg-gray-200 dark:hover:bg-[#3a3b3c]
              transition"
          >
            {n.message}
          </div>
        ))}
    </>
  )}

  {notificationsList.length === 0 && (
    <p className="p-4 text-sm text-gray-500 text-center">
      No notifications yet
    </p>
  )}
</div>
    </div>
</div>

  {/* ⚙️ SETTINGS */}
  <button
    onClick={(e) => {
      e.stopPropagation()
      setOpenSettings(true)
    }}
    className="bg-white dark:bg-gray-800 px-3 py-2 rounded-full shadow"
  >
    ⚙️
  </button>
</div>

      <div className="w-full max-w-md bg-white dark:bg-[#242526] text-black dark:text-white p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">

        <div className="flex items-center gap-4">

          {/* AVATAR */}
          <div className="relative">
            <img
              key={userData.avatar_url}
              src={userData.avatar_url || "/default.png"}
              onClick={(e) => {
                e.stopPropagation()
                setShowAvatarMenu(!showAvatarMenu)
              }}
              className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 cursor-pointer"
            />

            {showAvatarMenu && (
             <div
               onClick={(e) => e.stopPropagation()}
               className="absolute top-24 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow w-40 z-50"
               >
                <label className="block px-4 py-2 hover:bg-gray-100 cursor-pointer">
                  Upload Photo
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadAvatar(e.target.files[0])
                      setShowAvatarMenu(false)
                    }}
                  />
                </label>

                {userData.avatar_url && (
                  <button
                    onClick={() => {
                      deleteAvatar()
                      setShowAvatarMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* USER INFO */}
          <div>
            {editingName ? (
              <input
                value={username}
                autoFocus
                onChange={(e) => setUsername(e.target.value)}
                onBlur={saveUsername}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveUsername()
                }}
                className="text-xl font-semibold bg-transparent border-b outline-none"
              />
            ) : (
              <h1
                className="text-xl font-semibold cursor-pointer"
                onClick={() => setEditingName(true)}
              >
                {userData.username || "User"}
              </h1>
            )}

            <div className="flex gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-sm ${getLeagueStyle(league)}`}>
                {league} League
              </span>

              <span className={`px-2 py-1 rounded-full text-sm ${getLevelStyle(level)}`}>
                {level}
              </span>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="mt-6 grid grid-cols-3 text-center">
          <div>
            <p className="font-bold">{userData.score || 0}</p>
            <p className="text-sm">Score</p>
          </div>

          <div>
            <p className="font-bold text-orange-500">🔥 {streak}</p>
            <p className="text-sm">Streak</p>
          </div>

          <div>
            <p className="font-bold">{level}</p>
            <p className="text-sm">Identity</p>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{xp}/{maxXP} XP</span>
          </div>

          <div className="w-full bg-gray-300 h-2 rounded mt-1">
            <div
              className="bg-blue-600 h-2 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ACHIEVEMENTS */}
        <div className="mt-6">
          <h2 className="font-bold mb-2">Achievements</h2>

          {achievements.map((a, i) => (
            <div key={i}className="bg-white dark:bg-[#3a3b3c] p-3 rounded mb-2 shadow">
              <p className="font-semibold">{a.achievements.title}</p>
              <p className="text-sm text-gray-500">
                {a.achievements.description}
              </p>
            </div>
          ))}
        </div>

        {loading && <p className="text-sm mt-2">Uploading...</p>}
      </div>
      
      {/* SETTINGS PANEL */}
      {openSettings && (
  <>
    {/* BACKDROP */}
    <div
      className="fixed inset-0 bg-black/40 z-40"
      onClick={() => setOpenSettings(false)}
    />

    {/* SLIDE PANEL */}
      <div className={`
       fixed top-0 right-0 h-full w-[85%] max-w-sm 
       bg-white dark:bg-[#242526] text-black dark:text-white z-50 shadow-xl
       transform transition-transform duration-300
       ${openSettings ? "translate-x-0" : "translate-x-full"}
     `}>
      <div className="p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={() => setOpenSettings(false)}>✕</button>
        </div>

        {/* DARK MODE */}
        <div className="flex justify-between items-center mb-5">
          <span className="flex items-center gap-2">
            {theme === "dark" ? "🌙" : "☀️"} Appearance
          </span>

          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 px-4 py-1 rounded-full"
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>

        {/* NOTIFICATIONS */}
        <div className="flex justify-between items-center mb-5">
          <span>🔔 Notifications</span>
          <input
            type="checkbox"
            checked={notifications}
            onChange={async () => {
              const newValue = !notifications
              setNotifications(newValue)

              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return

              await supabase
                .from("users")
                .update({ notifications: newValue })
                .eq("id", user.id)
            }}
          />
        </div>
        {/* 🔊 SOUND VOLUME (ADD THIS HERE) */}
<div className="flex justify-between items-center mb-5">
  <span>🔊 Sound Volume</span>

  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={volume}
    onChange={(e) => setVolume(Number(e.target.value))}
    className="w-32"
  />
</div>

        {/* LOGOUT */}
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = "/login"
          }}
          className="w-full bg-red-500 text-white py-2 rounded mt-10"
        >
          Logout
        </button>

      </div>
      
    </div>
  </>
  )}
  <BottomNav />
    </main>
    </AuthGuard>
  )
}