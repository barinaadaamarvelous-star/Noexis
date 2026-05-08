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

      // 🧠 QUEUE + DEDUP
      const queue: { message: string; priority: number }[] = []
      const added = new Set()

      function enqueue(message: string, priority = 1) {
        if (added.has(message)) return
        added.add(message)
        queue.push({ message, priority })
      }

      // =========================
      // 🟢 1. INTENTIONS (HIGH PRIORITY)
      // =========================
      const { data: intentions } = await supabase
        .from("intentions")
        .select("*")
        .eq("user_id", user.id)

      for (const intent of intentions || []) {
        if (!intent.time) continue

        const [h, m] = intent.time.split(":")

const intentDate = new Date(
  new Date().toLocaleString("en-US", {
    timeZone: "Africa/Lagos",
  })
)

intentDate.setHours(Number(h), Number(m), 0, 0)

const diffMinutes =
  (intentDate.getTime() - now.getTime()) / 60000

console.log(
  "🧠 INTENT:",
  intent.behavior,
  "TIME:",
  intent.time,
  "NOW:",
  now.toLocaleTimeString(),
  "INTENT DATE:",
  intentDate.toLocaleTimeString(),
  "DIFF:",
  diffMinutes
)
        // ⏰ reminder
         // 🧠 DEBUG
console.log(
  "🧠 INTENT CHECK:",
  intent.behavior,
  "DIFF:",
  diffMinutes
)

// ⏰ reminder (WIDER WINDOW)
if (
  diffMinutes <= intent.remind_before &&
  diffMinutes >= intent.remind_before - 5
) {
  enqueue(
    `In ${intent.remind_before} min: ${intent.behavior} in ${intent.location}`,
    10
  )

  console.log("⏰ REMINDER QUEUED")
}

// 🚀 action (WIDER WINDOW)
if (diffMinutes <= 0 && diffMinutes >= -5) {
  enqueue(
    getIdentityMessage(user.level, intent.behavior),
    10
  )

  console.log("🚀 ACTION QUEUED")
}
         
        // 🔥 pressure
        if (diffMinutes <= -5 && diffMinutes > -7) {
          enqueue(
            `⏳ You said you'd ${intent.behavior}. Don't break this.`,
            9
          )
        }

        if (diffMinutes <= -10 && diffMinutes > -12) {
          enqueue(
            `🚨 Still not done: ${intent.behavior}. Discipline is built now.`,
            9
          )
        }
      }

      // =========================
      // 🔥 2. STREAK
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
          enqueue(`⚠️ Don’t break your ${user.streak}-day streak.`, 7)
        }

        if (hour >= 20) {
          enqueue(`🚨 Your ${user.streak}-day streak is about to die.`, 8)
        }
      }

      // =========================
// 🏆 3. LEADERBOARD (FIXED)
// =========================
if (oldRank && newRank < oldRank && personBelow) {
  enqueue(`🎉 You passed ${personBelow.username}`, 6)
}

if (oldRank && newRank > oldRank && personAbove) {
  enqueue(`🚀 ${personAbove.username} passed you`, 6)
}

// only show close alert if NOT changing ranks
if (oldRank === newRank && personAbove) {
  const diff = personAbove.score - user.score

  if (diff === 1) {
    enqueue(
      `🔥 You're 1 point away from beating ${personAbove.username}`,
      7
    )
  }

  if (diff > 1 && diff <= 10) {
    enqueue(
      `👀 ${diff} pts to beat ${personAbove.username}`,
      5
    )
  }
}

      // =========================
      // 🎯 ADDICTION LAYER
      // =========================
      const hour = now.getHours()

      if (hour === 9) {
        enqueue(`🎯 Daily mission: Complete 3 tasks today`, 6)
      }

      if (personAbove) {
        enqueue(
          `⚔️ Rival: ${personAbove.username}. Beat them today.`,
          4
        )
      }

      // =========================
      // 🚀 SEND TOP 3
      // =========================
      console.log("📬 FINAL QUEUE:", queue)
      const top = queue
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3)

      for (const item of top) {
        await send(user.id, item.message)
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

async function send(userId: string, message: string) {
  console.log("🚀 TRYING TO SEND:", message)

  const { data: recent } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("message", message)
    .gte(
      "created_at",
      new Date(Date.now() - 1000 * 60 * 10).toISOString()
    )

  if (recent && recent.length > 0) {
    console.log("🛑 BLOCKED BY ANTISPAM:", message)
    return
  }

  await supabase.from("notifications").insert({
    user_id: userId,
    message,
    created_at: new Date().toISOString(),
  })

  console.log("✅ SAVED TO DATABASE")

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)

  console.log("📦 SUBSCRIPTIONS:", subs)

  if (!subs) return

  for (const sub of subs) {
    try {
      console.log("📤 SENDING PUSH...")

      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: "Your Progress ⚡",
          body: message,
        })
      )

      console.log("✅ PUSH SENT")
    } catch (err: any) {
      console.error("❌ PUSH ERROR:", err)

      if (err?.statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id)
      }
    }
  }
}