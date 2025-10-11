import { useGame } from '../../context/GameContext'
import { getRarityColor } from '../../utils'

const GameDisplay = () => {
  const { activeNPC } = useGame()

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <div className="aspect-square bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-lg border border-gray-600 flex items-center justify-center">
        {activeNPC ? (
          <div className="text-center">
            <div className={`w-32 h-32 ${getRarityColor(activeNPC.rarity)} rounded-full flex items-center justify-center text-7xl mb-4`}>
              👤
            </div>
            <div className="text-2xl font-bold text-gray-100">{activeNPC.name}</div>
            <div className="text-sm text-gray-400 mt-2">Talking...</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">🏰</div>
            <div className="text-xl text-gray-300">Medieval Castle</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameDisplay

