type Props = {
  tasks: any[]
}

export default function TasksCard({ tasks }: Props) {

  return (
    <div className="lg:col-span-2 bg-zinc-900 p-6 rounded-2xl">
      <h2 className="text-lg text-zinc-400 mb-4">Today's Tasks</h2>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between bg-zinc-800 p-3 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={task.completed} readOnly />
              <span>{task.title}</span>
            </div>

            <span className="text-xs text-zinc-400">
              {task.difficulty}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}