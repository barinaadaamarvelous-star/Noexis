"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import BottomNav from "@/components/BottomNav"
import AuthGuard from "@/components/AuthGuard"
import { playSound } from "@/lib/sounds"
import html2canvas from 'html2canvas'

export default function MyProfile() {
  const [userData, setUserData] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [achievements, setAchievements] = useState<any[]>([])
  const scoreCardRef = useRef<HTMLDivElement>(null)
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

    case "Beginner":
      return `
        bg-gray-200 text-gray-700 border-gray-300
        dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700
      `

    case "Builder":
      return `
        bg-blue-100 text-blue-700 border-blue-200
        dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800
      `

    case "Focused":
      return `
        bg-green-100 text-green-700 border-green-200
        dark:bg-green-900/30 dark:text-green-300 dark:border-green-800
      `

    case "Relentless":
      return `
        bg-red-100 text-red-700 border-red-200
        dark:bg-red-900/30 dark:text-red-300 dark:border-red-800
      `

    case "Discipline Master":
      return `
        bg-purple-100 text-purple-700 border-purple-200
        dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800
      `

    default:
      return `
        bg-gray-200 text-gray-700 border-gray-300
        dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700
      `
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

  if (newLevel !== data.level) {

  console.log("LEVEL UP:", data.level, "➡", newLevel)

  await supabase
    .from("users")
    .update({ level: newLevel })
    .eq("id", user.id)

  data.level = newLevel

  const message = `⚡ ${getIdentityMessage(newLevel)}`

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
   const lastStreak = data.streak || 0
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

 async function downloadScoreCard() {
  if (!scoreCardRef.current) return

  const canvas = await html2canvas(scoreCardRef.current)

  const image = canvas.toDataURL("image/png")

  const link = document.createElement("a")
  link.href = image
  link.download = "discipline-scorecard.png"
  link.click()
}

async function shareScoreCard() {
  if (!scoreCardRef.current) return

  const canvas = await html2canvas(scoreCardRef.current)

  canvas.toBlob(async (blob) => {
    if (!blob) return

    const file = new File(
      [blob],
      "discipline-scorecard.png",
      { type: "image/png" }
    )

    if (navigator.share) {
      await navigator.share({
        title: "My Discipline Score",
        text: `🔥 ${userData.username} is in ${league} League with ${userData.score} points!`,
        files: [file],
      })
    } else {
      downloadScoreCard()
    }
  })
}
  return (
  <AuthGuard>
    <main className="min-h-screen bg-[#f5f5f5] dark:bg-black text-black dark:text-white px-4 py-6 flex justify-center">

      <div className="w-full max-w-md">

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">

          <div>
            <p className="text-xs uppercase tracking-[3px] text-yellow-500">
              Elite Profile
            </p>

            <h1 className="text-3xl font-bold">
              My Profile
            </h1>
          </div>

          <div className="flex items-center gap-3">

            {/* NOTIFICATION */}
            <div className="relative">

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDropdown(!showDropdown)
                }}
                className="relative h-11 w-11 rounded-full
                bg-white/10 dark:bg-white/5
                border border-yellow-500/20
                backdrop-blur-xl
                flex items-center justify-center"
              >
                🔔
              </button>

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}

            </div>

            {/* SETTINGS */}
            <button
              onClick={() => setOpenSettings(true)}
              className="h-11 w-11 rounded-full
              bg-white/10 dark:bg-white/5
              border border-yellow-500/20
              backdrop-blur-xl
              flex items-center justify-center"
            >
              ⚙️
            </button>

          </div>
        </div>

        <div
  ref={scoreCardRef}
  className="
    relative overflow-hidden
    rounded-3xl
    border border-yellow-500/20
    bg-gradient-to-br
    from-[#111]
    via-[#1a1a1a]
    to-black
    text-white
    shadow-2xl
    p-6
  "
>

          {/* GOLD GLOW */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#facc15,_transparent_60%)]" />

          <div className="relative z-10">

            {/* PROFILE */}
            <div className="flex items-center gap-4">

              {/* AVATAR */}
              <div className="relative">

                <img
                  src={userData.avatar_url || "/default.png"}
                  className="
                  w-24 h-24 rounded-full object-cover
                  border-4 border-yellow-500
                  shadow-[0_0_25px_rgba(250,204,21,0.4)]
                  cursor-pointer
                "
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAvatarMenu(!showAvatarMenu)
                  }}
                />

                {showAvatarMenu && (
                  <div className="
                    absolute top-28 left-0 z-50
                    w-44 overflow-hidden
                    rounded-2xl
                    border border-gray-700
                    bg-[#111]
                    shadow-2xl
                  ">

                    <label className="block px-4 py-3 hover:bg-white/10 cursor-pointer text-sm">
                      Upload Photo

                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            uploadAvatar(e.target.files[0])
                          }
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
                        className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/10 text-sm"
                      >
                        Remove Photo
                      </button>
                    )}

                  </div>
                )}
              </div>

              {/* USER INFO */}
              <div className="flex-1">

                {editingName ? (
                  <input
                    value={username}
                    autoFocus
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={saveUsername}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveUsername()
                    }}
                    className="bg-transparent border-b border-yellow-500 text-2xl font-bold outline-none"
                  />
                ) : (
                  <h2
                    onClick={() => setEditingName(true)}
                    className="text-2xl font-bold cursor-pointer"
                  >
                    {userData.username}
                  </h2>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">

                  <span className="
                    px-3 py-1 rounded-full text-xs font-semibold
                    bg-yellow-500/10 text-yellow-400
                    border border-yellow-500/20
                  ">
                    {league} League
                  </span>

                  <span
  className={`
    px-3 py-1 rounded-full text-xs font-semibold border
    ${getLevelStyle(level)}
  `}
>
  {level}
</span>

                </div>

              </div>

            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-3 mt-8">

              <div className="
                rounded-2xl p-4
                bg-white/5 border border-white/10
                text-center
              ">
                <p className="text-2xl font-bold text-yellow-400">
                  {userData.score || 0}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  SCORE
                </p>
              </div>

              <div className="
                rounded-2xl p-4
                bg-white/5 border border-white/10
                text-center
              ">
                <p className="text-2xl font-bold text-orange-400">
                  🔥 {streak}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  STREAK
                </p>
              </div>

              <div className="
                rounded-2xl p-4
                bg-white/5 border border-white/10
                text-center
              ">
                <p className="text-lg font-bold text-cyan-400">
                  {xp}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  XP
                </p>
              </div>

            </div>

            {/* XP BAR */}
            <div className="mt-8">

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">
                  Progress
                </span>

                <span className="text-yellow-400 font-semibold">
                  {xp}/{maxXP} XP
                </span>
              </div>

              <div className="h-3 rounded-full bg-white/10 overflow-hidden">

                <div
                  className="
                    h-full rounded-full
                    bg-gradient-to-r from-yellow-400 to-yellow-600
                  "
                  style={{ width: `${progress}%` }}
                />

              </div>

            </div>

          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">

  <button
    onClick={shareScoreCard}
    className="
      py-3 rounded-2xl
      bg-yellow-500 text-black
      font-bold
    "
  >
    Share Scorecard
  </button>

  <button
    onClick={downloadScoreCard}
    className="
      py-3 rounded-2xl
      bg-white/10 border border-white/10
      text-white font-bold
    "
  >
    Download
  </button>

</div>

        {/* ACHIEVEMENTS */}
        <div className="mt-6">

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              Achievements
            </h2>

            <span className="text-sm text-gray-500">
              {achievements.length} unlocked
            </span>
          </div>

          <div className="space-y-3">

            {achievements.map((a, i) => (
              <div
                key={i}
                className="
                  rounded-2xl p-4
                  bg-white dark:bg-[#111]
                  border border-gray-200 dark:border-gray-800
                  shadow-sm
                "
              >
                <p className="font-semibold">
                  {a.achievements.title}
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  {a.achievements.description}
                </p>
              </div>
            ))}

          </div>

        </div>

      </div>

      {/* NOTIFICATION DROPDOWN */}
      {showDropdown && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            fixed top-20 right-4 z-50
            w-[90%] max-w-sm
            rounded-3xl overflow-hidden
            border border-gray-700
            bg-[#111]
            text-white
            shadow-2xl
          "
        >

          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold">
              Notifications
            </h2>

            <button
              onClick={markNotificationsRead}
              className="text-xs text-yellow-400"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">

           {notificationsList.map((n, i) => (
  <div
    key={i}
    onClick={async () => {
      if (!n.read) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", n.id)

        setNotificationsList(prev =>
          prev.map(item =>
            item.id === n.id
              ? { ...item, read: true }
              : item
          )
        )

        setUnreadCount(prev => Math.max(prev - 1, 0))
      }
    }}
    className={`
      px-4 py-4 text-sm
      border-b border-gray-800
      transition cursor-pointer

      ${
        n.read
          ? "bg-[#111] text-gray-400 hover:bg-[#181818]"
          : "bg-yellow-500/10 text-white hover:bg-yellow-500/20 border-l-4 border-yellow-400"
      }
    `}
  >

    <div className="flex items-start justify-between gap-3">

      <p className="leading-relaxed">
        {n.message}
      </p>

      {!n.read && (
        <span className="mt-1 h-2 w-2 rounded-full bg-yellow-400 shrink-0" />
      )}

    </div>

  </div>
))}
          </div>

        </div>
      )}

      {/* SETTINGS PANEL */}
      {openSettings && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setOpenSettings(false)}
          />

          <div className="
            fixed top-0 right-0 z-50
            h-full w-[90%] max-w-sm
            bg-[#0b0b0b]
            text-white
            border-l border-yellow-500/20
            p-6
            overflow-y-auto
          ">

            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">
                Settings
              </h2>

              <button onClick={() => setOpenSettings(false)}>
                ✕
              </button>
            </div>

            {/* THEME */}
            <div className="mb-6">

              <p className="text-sm text-gray-400 mb-2">
                Appearance
              </p>

              <button
                onClick={toggleTheme}
                className="
                  w-full rounded-2xl p-4
                  bg-white/5 border border-white/10
                  text-left
                "
              >
                {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </button>

            </div>

            {/* NOTIFICATIONS */}
            <div className="mb-6">

              <div className="flex items-center justify-between">

                <span>Notifications</span>

                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={async () => {
                    const newValue = !notifications
                    setNotifications(newValue)

                    const { data: { user } } =
                      await supabase.auth.getUser()

                    if (!user) return

                    await supabase
                      .from("users")
                      .update({ notifications: newValue })
                      .eq("id", user.id)
                  }}
                />

              </div>

            </div>

            {/* VOLUME */}
            <div className="mb-8">

              <p className="mb-3">
                Sound Volume
              </p>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) =>
                  setVolume(Number(e.target.value))
                }
                className="w-full"
              />

            </div>

            {/* LOGOUT */}
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = "/login"
              }}
              className="
                w-full rounded-2xl py-4
                bg-red-500 hover:bg-red-600
                font-semibold transition
              "
            >
              Logout
            </button>

          </div>
        </>
      )}

      <BottomNav />

    </main>
  </AuthGuard>
)
}