import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔒 server only
)

// ✅ VAPID setup
webpush.setVapidDetails(
  "mailto:test@test.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId, message } = await req.json()

    console.log("📤 SEND PUSH:", { userId, message })

    // ✅ get ONLY this user's subscriptions
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)

    if (error) {
      console.error("❌ DB ERROR:", error)
      return new Response("DB error", { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log("❌ No subscriptions found")
      return new Response("No subscriptions", { status: 200 })
    }

    console.log("📦 USER SUBSCRIPTIONS:", data)

    // ✅ send notification
    for (const sub of data) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: "Leaderboard",
            body: message,
          })
        )

      } catch (err: any) {
        console.error("❌ Push failed:", err)

        // 🔁 RETRY ONCE
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: "Leaderboard",
              body: message,
            })
          )
          console.log("🔁 Retry success")
        } catch (retryErr) {
          console.log("❌ Retry failed")
        }

        // 🧹 REMOVE expired subscription
        if (err?.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id)

          console.log("🧹 Removed expired subscription")
        }
      }
    }

    return new Response("OK")

  } catch (err) {
    console.error("🔥 FATAL ERROR:", err)
    return new Response("Server error", { status: 500 })
  }
}