import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  "mailto:test@test.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET() {
  try {
    const now = new Date()

    // 🔥 GET ALL USERS SORTED BY SCORE
    const { data: users } = await supabase
      .from("users")
      .select("id, username, score, streak, last_rank")
      .order("score", { ascending: false })

    if (!users) return new Response("No users")

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const newRank = i + 1
      const oldRank = user.last_rank

      const personAbove = users[i - 1]
      const personBelow = users[i + 1]

      // 🧠 PRIORITY CONTROL (ONLY 1 MESSAGE PER RUN)
      async function sendSafe(message: string) {
      await send(user.id, message)
      }

      // =========================
      // 🟢 1. INTENTIONS
      // =========================
      const { data: intentions } = await supabase
        .from("intentions")
        .select("*")
        .eq("user_id", user.id)

      for (const intent of intentions || []) {
        if (!intent.time) continue

        const [h, m] = intent.time.split(":")
        const intentDate = new Date()
        intentDate.setHours(Number(h), Number(m), 0)

        const diffMinutes = Math.round(
  (intentDate.getTime() - now.getTime()) / 60000
)

     // ⏰ BEFORE TIME (±1 minute window)
if (
  intent.remind_before !== null &&
  diffMinutes <= intent.remind_before &&
  diffMinutes >= intent.remind_before - 1
) {
  await sendSafe(
    `In ${intent.remind_before} min: ${intent.behavior} in ${intent.location}`
  )
}

// 🚀 EXACT TIME (±1 minute window)
if (diffMinutes <= 0 && diffMinutes >= -1) {
  await sendSafe(
    `Now: ${intent.behavior} in ${intent.location} 🚀`
  )
}
      }

      // =========================
      // 🔥 2. STREAK WARNING
      // =========================
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: logs } = await supabase
        .from("task_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("completed_at", todayStart.toISOString())

      if ((!logs || logs.length === 0) && user.streak > 0) {
        const hour = now.getHours()

        if (hour >= 18) {
          await sendSafe(
            `⚠️ Don’t break your ${user.streak}-day streak. Do 1 task now.`
          )
        }
      }

      // =========================
      // 🏆 3. LEADERBOARD EVENTS
      // =========================

      // 🟢 YOU PASSED SOMEONE
      if (oldRank && newRank < oldRank && personBelow) {
        await sendSafe(
          `You passed ${personBelow.username} 🎉`
        )
      }

      // 🔴 SOMEONE PASSED YOU
      if (oldRank && newRank > oldRank && personAbove) {
        await sendSafe(
          `${personAbove.username} just passed you 🚀`
        )
      }

      // 👀 CLOSE ALERT
      if (personAbove) {
        const diff = personAbove.score - user.score

        if (diff > 0 && diff <= 10) {
          await sendSafe(
            `You’re ${diff} pts away from beating ${personAbove.username} 👀`
          )
        }
      }

      // =========================
      // 🔄 UPDATE LAST RANK
      // =========================
      await supabase
        .from("users")
        .update({ last_rank: newRank })
        .eq("id", user.id)
    }

    return new Response("🧠 Brain executed")
  } catch (err) {
    console.error("BRAIN ERROR:", err)
    return new Response("Error", { status: 500 })
  }
}

// =========================
// 🚀 SEND FUNCTION (DB + PUSH + ANTI-SPAM)
// =========================
async function send(userId: string, message: string) {
  // 🛑 PREVENT SPAM (60s window)
  const { data: recent } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("message", message)
    .gte("created_at", new Date(Date.now() - 60000).toISOString())

  if (recent && recent.length > 0) return

  // ✅ SAVE TO DATABASE
  await supabase.from("notifications").insert({
    user_id: userId,
    message,
    created_at: new Date().toISOString(),
  })

  // ✅ SEND PUSH
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)

  if (!subs) return

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: "Your Progress ⚡",
          body: message,
        })
      )
    } catch (err: any) {
      // 🧹 remove dead subscriptions
      if (err?.statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id)
      }
    }
  }
}