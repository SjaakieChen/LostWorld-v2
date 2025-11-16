import { usePlayerUI } from '../../context/PlayerUIContext'
import { RARITY_COLORS } from '../../constants/rarity.constants'

const StatsPanel = () => {
  const { playerStats, statChangeIndicators } = usePlayerUI()
  
  const getTierBarClass = (tier: number) => {
    switch (tier) {
      case 2:
        return RARITY_COLORS.common
      case 3:
        return RARITY_COLORS.rare
      case 4:
        return RARITY_COLORS.epic
      case 5:
        return RARITY_COLORS.legendary
      default:
        return 'bg-gray-500'
    }
  }

  const tierBadgeClass = 'bg-gray-700 text-gray-200'

  const formatDelta = (delta = 0) => {
    if (!delta) return null
    const className = delta > 0 ? 'text-green-400' : 'text-red-400'
    const prefix = delta > 0 ? '+' : ''
    return <span className={`text-xs font-semibold ${className}`}>{`${prefix}${delta}`}</span>
  }
  
  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4">Stats</h2>
      <div className="space-y-3">
        {Object.entries(playerStats).map(([name, stat], idx) => {
          const tierName = stat.tierNames[stat.tier - 1] || 'Unknown'
          const barClass = getTierBarClass(stat.tier)
          const delta = statChangeIndicators[name] ?? 0
          return (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1 items-center">
                <div className="flex items-center gap-2">
                  <span className="capitalize">{name.replace(/_/g, ' ')}</span>
                  {formatDelta(delta)}
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border border-gray-700 ${tierBadgeClass}`}
                >
                  {tierName}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 border border-gray-600">
                <div
                  className={`${barClass} h-full rounded-full transition-all duration-300`}
                  style={{ width: `${stat.value}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex justify-end">
                <span>Tier {stat.tier}/5</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StatsPanel

