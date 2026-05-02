import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const now = new Date()

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
    if (!intent.time) return { ...intent, error: "No time set" }

    const [h, m] = intent.time.split(":")
    const intentDate = new Date()
    intentDate.setHours(Number(h), Number(m), 0)

    const diffMinutes = Math.round(
      (intentDate.getTime() - now.getTime()) / 60000
    )

    return {
      behavior: intent.behavior,
      location: intent.location,
      time: intent.time,
      remind_before: intent.remind_before,
      now: now.toISOString(),
      intentTime: intentDate.toISOString(),
      diffMinutes,

      willTriggerBefore:
        intent.remind_before !== null &&
        diffMinutes <= intent.remind_before &&
        diffMinutes >= intent.remind_before - 1,

      willTriggerNow:
        diffMinutes <= 0 && diffMinutes >= -1,
    }
  })

  return Response.json(debug, { status: 200 })
}