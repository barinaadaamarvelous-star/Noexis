import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  "mailto:you@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  const { user_id, message } = await req.json()

  const { data } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", user_id)

  for (const sub of data || []) {
    await webpush.sendNotification(
      sub.subscription,
      JSON.stringify({
        title: "Leaderboard Update 🚀",
        body: message,
      })
    )
  }

  return new Response("ok")
}