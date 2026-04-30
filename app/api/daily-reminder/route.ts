import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"
import "@/lib/startCron"

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
    console.log("⏰ Running daily reminder job...")

    // ✅ get all users
    const { data: users, error } = await supabase
      .from("users")
      .select("id, streak, notifications")

    if (error) throw error

    for (const user of users || []) {
      if (!user.notifications) continue // 🔕 respect toggle

      // ✅ get last activity
      const { data: logs } = await supabase
        .from("task_logs")
        .select("completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)

      if (!logs || logs.length === 0) continue

      const lastDate = new Date(logs[0].completed_at)
      const today = new Date()

      const diff =
        (today.getTime() - lastDate.getTime()) /
        (1000 * 60 * 60 * 24)

      // 🔥 ONLY remind if user hasn't completed today
      if (diff >= 1) {
        const message =
          user.streak >= 5
            ? `⚠️ You're about to lose a ${user.streak}-day streak 😳`
            : `🔥 Stay consistent! Don't break your streak!`

        console.log("📣 Sending reminder:", message)

        // ✅ save to notifications table
        await supabase.from("notifications").insert({
          user_id: user.id,
          message,
        })

        // ✅ get push subscriptions
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", user.id)

        for (const sub of subs || []) {
          try {
            await webpush.sendNotification(
              sub.subscription,
              JSON.stringify({
                title: "Reminder",
                body: message,
              })
            )
          } catch (err: any) {
            if (err.statusCode === 410) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id)
            }
          }
        }
      }
    }

    return new Response("Daily reminders sent ✅")
  } catch (err) {
    console.error("❌ Daily job error:", err)
    return new Response("Error", { status: 500 })
  }
}