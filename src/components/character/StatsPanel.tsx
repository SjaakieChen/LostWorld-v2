import { usePlayerUI } from '../../context/PlayerUIContext'

const StatsPanel = () => {
  const { playerStats } = usePlayerUI()
  
  const statColors = [
    'bg-red-400', 'bg-green-400', 'bg-blue-400',
    'bg-purple-400', 'bg-yellow-400', 'bg-orange-400'
  ]
  
  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4">Stats</h2>
      <div className="space-y-3">
        {Object.entries(playerStats).map(([name, stat], idx) => {
          const tierName = stat.tierNames[stat.tier - 1] || 'Unknown'
          const colorClass = statColors[idx % statColors.length]
          
          return (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">{name.replace(/_/g, ' ')}</span>
                <span className="text-gray-400">{tierName}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 border border-gray-600">
                <div
                  className={`${colorClass} h-full rounded-full transition-all duration-300`}
                  style={{ width: `${stat.value}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-right mt-1">
                Tier {stat.tier}/5
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StatsPanel

