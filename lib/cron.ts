import cron from "node-cron"

export function startCronJobs() {
  console.log("⏰ Cron started...")

  // runs every day at 7PM Nigeria time
  cron.schedule("0 19 * * *", async () => {
    console.log("🔥 Running daily reminder job...")

    try {
      await fetch("http://localhost:3000/api/daily-reminder")
      console.log("✅ Daily reminder triggered")
    } catch (err) {
      console.error("❌ Cron failed:", err)
    }
  })
}