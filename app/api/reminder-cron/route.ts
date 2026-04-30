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
  const now = new Date()

  const currentTime = now.toTimeString().slice(0, 5) // "06:00"

  const { data: intentions } = await supabase
    .from("intentions")
    .select("*")

  for (const i of intentions || []) {
    const [h, m] = i.time.split(":").map(Number)

    const reminderTime = new Date()
    reminderTime.setHours(h)
    reminderTime.setMinutes(m - i.remind_before)

    const reminderStr = reminderTime.toTimeString().slice(0, 5)

    if (reminderStr === currentTime) {
      const message = `You said you'd ${i.behavior} in ${i.location} 👀`

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", i.user_id)

      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: "Reminder",
              body: message,
            })
          )
        } catch {}
      }
    }
  }

  return new Response("OK")
}