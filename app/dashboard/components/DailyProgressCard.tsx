type Props = {
  tasks: any[]
}

export default function DailyProgressCard({ tasks }: Props) {

  const completed = tasks.filter(t => t.completed).length
  const total = tasks.length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl">
      <h2 className="text-lg text-zinc-400 mb-4">Today's Progress</h2>

      <p className="text-3xl font-bold">{percent}%</p>

      <p className="text-zinc-400 text-sm mt-2">
        {completed} / {total} Tasks Completed
      </p>
    </div>
  )
}