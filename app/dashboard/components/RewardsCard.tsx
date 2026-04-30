type Props = {
  rewards: any
}

export default function RewardsCard({ rewards }: Props) {

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl">
      <h2 className="text-lg text-zinc-400 mb-3">
        Rewards & Discipline Points
      </h2>

      <p className="text-2xl font-bold mb-2">
        {rewards?.discipline_points ?? 0} Points
      </p>

      <p className="text-zinc-400 text-sm">
        Badges unlocked: {rewards?.badges_unlocked ?? 0}
      </p>
    </div>
  )
}