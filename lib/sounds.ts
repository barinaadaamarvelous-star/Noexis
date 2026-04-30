let lastPlayed = 0

export function playSound(
  type: "pass" | "overtaken" | "default" = "default",
  volume: number = 0.25
) {
  try {
    const now = Date.now()

    // ⏱️ cooldown
    if (now - lastPlayed < 800) return
    lastPlayed = now

    // 🔇 if tab inactive
    if (document.hidden) return

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)

    function tone(freq: number, start: number, duration: number) {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq

      const g = ctx.createGain()
      g.gain.setValueAtTime(volume, ctx.currentTime + start)
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + duration
      )

      osc.connect(g)
      g.connect(gain)

      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    // 🎧 sound types
    if (type === "pass") {
      tone(600, 0, 0.12)
      tone(900, 0.12, 0.12)
      tone(1200, 0.24, 0.15)
    } else if (type === "overtaken") {
      tone(700, 0, 0.15)
      tone(500, 0.15, 0.15)
      tone(300, 0.3, 0.2)
    } else {
      tone(800, 0, 0.1)
      tone(1000, 0.1, 0.1)
    }
  } catch (err) {
    console.error("Sound error:", err)
  }
}