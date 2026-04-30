import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const now = new Date()

  // 🔥 check next 3 minutes window
  const future = new Date(now.getTime() + 3 * 60 * 1000)

  const { data } = await supabase
    .from("intentions")
    .select("*")

  for (const item of data || []) {
    const target = new Date()
    const [h, m] = item.time.split(":")
    target.setHours(Number(h), Number(m), 0, 0)

    const reminderTime = new Date(
      target.getTime() - item.reminder_offset * 60 * 1000
    )

    if (reminderTime >= now && reminderTime <= future) {
      const message = `⏰ In ${item.reminder_offset} mins: ${item.behavior} at ${item.location}`

      await fetch(process.env.NEXT_PUBLIC_SITE_URL + "/api/send-notification", {
        method: "POST",
        body: JSON.stringify({
          userId: item.user_id,
          message,
        }),
      })
    }
  }

  return new Response("ok")
}