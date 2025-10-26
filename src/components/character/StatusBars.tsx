import { usePlayerUI } from '../../context/PlayerUIContext'

const StatusBars = () => {
  const { playerStatus } = usePlayerUI()
  
  const statuses = [
    { name: 'Health', value: playerStatus.health, max: playerStatus.maxHealth, color: 'bg-red-500' },
    { name: 'Energy', value: playerStatus.energy, max: playerStatus.maxEnergy, color: 'bg-yellow-500' },
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

