import { useEffect, useRef } from "react"

type Props = {
  currentUser: any
  leaders: any[]
  myRank: number | null
  notifications: boolean
  safePlay: (type: "pass" | "overtaken" | "default") => void
  setNotification: (msg: string | null) => void
  sendNotification: (msg: string) => Promise<void>
}

export function useLeaderboardWatcher({
  currentUser,
  leaders,
  myRank,
  notifications,
  safePlay,
  setNotification,
  sendNotification,
}: Props) {
  const prevRankRef = useRef<number | null>(null)
  const lastKeyRef = useRef<string | null>(null)
  const lastCloseRef = useRef<string | null>(null)

  useEffect(() => {
    async function run() {
      if (!currentUser || !leaders.length || !myRank) return

      const prev = prevRankRef.current

      // first load → just set baseline
      if (prev === null) {
        prevRankRef.current = myRank
        return
      }

      // helper to avoid duplicates
      async function trigger(
        message: string,
        sound: "pass" | "overtaken" | "default",
        key: string
      ) {
        if (lastKeyRef.current === key) return
        lastKeyRef.current = key

        setNotification(message)

        if (notifications) {
          safePlay(sound)
        }

        setTimeout(() => setNotification(null), 4000)

        await sendNotification(message)
      }

      // =========================
      // 🟢 YOU PASSED SOMEONE
      // =========================
      if (myRank < prev) {
        const passedUser = leaders[myRank] // now below you

        if (passedUser && passedUser.id !== currentUser.id) {
          const key = `you-passed-${passedUser.id}-${myRank}`

          await trigger(
            `You passed ${passedUser.username} 🎉`,
            "pass",
            key
          )
        }
      }

      // =========================
      // 🔴 SOMEONE PASSED YOU
      // =========================
      if (myRank > prev && myRank > 1) {
        const passer = leaders[myRank - 2]

        if (passer && passer.id !== currentUser.id) {
          const key = `they-passed-${passer.id}-${myRank}`

          await trigger(
            `${passer.username} just passed you 🚀`,
            "overtaken",
            key
          )
        }
      }

      // =========================
      // 🏆 YOU ARE #1
      // =========================
      if (myRank === 1 && prev !== 1) {
        const key = "leader-1"

        await trigger(
          "👑 You're now #1. Stay on top.",
          "pass",
          key
        )
      }

      // =========================
      // 🧠 CLOSE TO PASSING (SMART)
      // =========================
      if (myRank > 1) {
        const personAbove = leaders[myRank - 2]

        if (personAbove) {
          const myScore = currentUser.score || 0
          const theirScore = personAbove.score || 0
          const diff = theirScore - myScore

          // only trigger when VERY close
          if (diff > 0 && diff <= 10) {
            const key = `close-${personAbove.id}-${diff}`

            // cooldown: avoid repeating same message
            if (lastCloseRef.current !== key) {
              lastCloseRef.current = key

              await trigger(
                `You're ${diff} pts away from beating ${personAbove.username} 👀`,
                "default",
                key
              )
            }
          }
        }
      }

      // update previous rank
      prevRankRef.current = myRank
    }

    run()
  }, [currentUser, leaders, myRank, notifications])
}