export default function IdentityCard({ user }: { user: any }) {
  const progress = (user.identity_level / 100) * 100; // Example calculation
  return (
    <div className="lg:col-span-3 bg-zinc-900 p-6 rounded-2xl">
      <h2 className="text-lg text-zinc-400 mb-2">Your Identity</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">{user.current_identity}</p>
          <p className="text-zinc-400">You are becoming more disciplined every day.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-400">Next Level</p>
          <p className="font-semibold">{user.next_identity}</p>
        </div>
      </div>
      <div className="mt-4 w-full bg-zinc-800 h-3 rounded-full">
        <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-zinc-500 mt-2">Level Progress: {progress.toFixed(0)}%</p>
    </div>
  );
}