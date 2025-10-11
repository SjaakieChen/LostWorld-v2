const StatsPanel = () => {
  const stats = [
    { name: 'Strength', value: 15, color: 'text-red-400' },
    { name: 'Dexterity', value: 12, color: 'text-green-400' },
    { name: 'Intelligence', value: 18, color: 'text-blue-400' },
    { name: 'Wisdom', value: 14, color: 'text-purple-400' },
    { name: 'Stealth', value: 10, color: 'text-gray-400' },
    { name: 'Charisma', value: 16, color: 'text-yellow-400' },
  ]

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4">Stats</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-gray-800 rounded p-3 border border-gray-600">
            <div className="text-sm text-gray-400">{stat.name}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsPanel

