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

// 🧠 IDENTITY ENGINE
function getIdentityMessage(level: string, action: string) {
  switch (level) {
    case "Focused":
      return `🎯 Focused people don't delay. Go ${action} now.`
    case "Relentless":
      return `🔥 No excuses. ${action} right now.`
    case "Discipline Master":
      return `👑 This is who you are. ${action}.`
    default:
      return `Start now: ${action}.`
  }
}

export async function GET() {
  try {
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })
    )

    const { data: users } = await supabase
      .from("users")
      .select("id, username, score, streak, last_rank, level")
      .order("score", { ascending: false })

    if (!users) return new Response("No users")

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const newRank = i + 1
      const oldRank = user.last_rank

      const personAbove = users[i - 1]
      const personBelow = users[i + 1]

      let sent = false

      async function sendSafe(message: string) {
        if (sent) return
        sent = true
        await send(user.id, message)
      }

      // =========================
      // 🟢 1. INTENTIONS (LEVEL 1–3)
      // =========================
      const { data: intentions } = await supabase
        .from("intentions")
        .select("*")
        .eq("user_id", user.id)

      for (const intent of intentions || []) {
        if (!intent.time) continue

        const [h, m] = intent.time.split(":")
        const intentDate = new Date(now)
        intentDate.setHours(Number(h), Number(m), 0, 0)

        const diffMinutes =
          (intentDate.getTime() - now.getTime()) / 60000

        // 🟢 LEVEL 1: REMINDER
        if (
          diffMinutes <= intent.remind_before &&
          diffMinutes > intent.remind_before - 2
        ) {
          await sendSafe(
            `In ${intent.remind_before} min: ${intent.behavior} in ${intent.location}`
          )
        }

        // 🚀 LEVEL 2: ACTION + IDENTITY
        if (diffMinutes <= 0 && diffMinutes > -2) {
          await sendSafe(
            getIdentityMessage(user.level, intent.behavior)
          )
        }

        // 🔥 LEVEL 3: PRESSURE ESCALATION
        if (diffMinutes <= -5 && diffMinutes > -7) {
          await sendSafe(
            `⏳ You said you'd ${intent.behavior}. Don't break this.`
          )
        }

        if (diffMinutes <= -10 && diffMinutes > -12) {
          await sendSafe(
            `🚨 Still not done: ${intent.behavior}. This is where discipline is built.`
          )
        }
      }

      // =========================
      // 🔥 2. STREAK PRESSURE (UPGRADED)
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

        if (hour >= 18 && hour < 20) {
          await sendSafe(
            `⚠️ Don’t break your ${user.streak}-day streak.`
          )
        }

        if (hour >= 20) {
          await sendSafe(
            `🚨 Your ${user.streak}-day streak is about to die. Act now.`
          )
        }
      }

      // =========================
      // 🏆 3. LEADERBOARD (UPGRADED)
      // =========================

      if (oldRank && newRank < oldRank && personBelow) {
        await sendSafe(
          `🎉 You passed ${personBelow.username}`
        )
      }

      if (oldRank && newRank > oldRank && personAbove) {
        await sendSafe(
          `🚀 ${personAbove.username} just passed you`
        )
      }

      if (personAbove) {
        const diff = personAbove.score - user.score

        if (diff === 1) {
          await sendSafe(
            `🔥 You're 1 point away from beating ${personAbove.username}`
          )
        }

        if (diff > 0 && diff <= 10) {
          await sendSafe(
            `👀 ${diff} pts to beat ${personAbove.username}`
          )
        }
      }

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
// 🚀 SEND FUNCTION
// =========================
async function send(userId: string, message: string) {
  const { data: recent } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("message", message)
    .gte("created_at", new Date(Date.now() - 60000).toISOString())

  if (recent && recent.length > 0) return

  await supabase.from("notifications").insert({
    user_id: userId,
    message,
    created_at: new Date().toISOString(),
  })

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
      if (err?.statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id)
      }
    }
  }
}