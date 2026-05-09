import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const now = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Africa/Lagos",
    })
  )

  const { data: users } = await supabase
    .from("users")
    .select("id, username")
    .limit(1)

  if (!users || users.length === 0) {
    return new Response("No users")
  }

  const user = users[0]

  const { data: intentions } = await supabase
    .from("intentions")
    .select("*")
    .eq("user_id", user.id)

  const debug = (intentions || []).map((intent) => {
    if (!intent.time) {
      return {
        error: "No time set",
      }
    }

    const [h, m] = intent.time.split(":")

    const intentDate = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Africa/Lagos",
      })
    )

    intentDate.setHours(Number(h), Number(m), 0, 0)

    const diffMinutes =
      (intentDate.getTime() - now.getTime()) / 60000

    return {
      behavior: intent.behavior,
      location: intent.location,
      time: intent.time,
      remind_before: intent.remind_before,

      now: now.toLocaleString(),
      intentTime: intentDate.toLocaleString(),

      diffMinutes,

      willTriggerBefore:
        diffMinutes <= intent.remind_before &&
        diffMinutes >= intent.remind_before - 5,

      willTriggerNow:
        diffMinutes <= 0 &&
        diffMinutes >= -5,
    }
  })

  return Response.json(debug, { status: 200 })
}