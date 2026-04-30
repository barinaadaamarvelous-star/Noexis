type Props = {
  user: any
  tasks: any[]
  streak: any
}

export default function ShareProgressCard({ user, tasks, streak }: Props) {

  const completed = tasks.filter(t => t.completed).length

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl">
      <h2 className="text-lg text-zinc-400 mb-3">
        Share Progress
      </h2>

      <p className="text-sm text-zinc-400 mb-4">
        Share your discipline proof.
      </p>

      <div className="bg-zinc-800 p-4 rounded-lg text-sm">
        {user?.username} • Day {streak?.streak_days ?? 0} streak.  
        Tasks completed today: {completed}.
      </div>
    </div>
  )
}