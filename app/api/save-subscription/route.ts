import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ IMPORTANT
)

export async function POST(req: Request) {
  const body = await req.json()

  const { error } = await supabase
    .from("push_subscriptions")
    .insert({
      subscription: body,
    })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}