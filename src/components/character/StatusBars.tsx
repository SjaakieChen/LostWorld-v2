const StatusBars = () => {
  const statuses = [
    { name: 'Health', value: 85, max: 100, color: 'bg-red-500' },
    { name: 'Stamina', value: 60, max: 100, color: 'bg-green-500' },
    { name: 'Hunger', value: 40, max: 100, color: 'bg-orange-500' },
    { name: 'Mana', value: 90, max: 100, color: 'bg-blue-500' },
  ]

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4">Status</h2>
      <div className="space-y-3">
        {statuses.map((status) => (
          <div key={status.name}>
            <div className="flex justify-between text-sm mb-1">
              <span>{status.name}</span>
              <span className="text-gray-400">{status.value}/{status.max}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4 border border-gray-600">
              <div
                className={`${status.color} h-full rounded-full transition-all duration-300`}
                style={{ width: `${(status.value / status.max) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatusBars

