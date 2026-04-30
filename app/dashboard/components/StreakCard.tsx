type Props = {
  streak: any
}

export default function StreakCard({ streak }: Props) {

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl">
      <h2 className="text-lg text-zinc-400 mb-2">Current Streak</h2>

      <p className="text-4xl font-bold">
        {streak?.streak_days ?? 0} Days
      </p>

      <p className="text-zinc-500 text-sm mt-2">
        Don't break the streak!
      </p>
    </div>
  )
}