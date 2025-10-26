import { usePlayerUI } from '../../context/PlayerUIContext'
import { getRarityColor } from '../../utils'

const GameDisplay = () => {
  const { activeNPC, currentLocation } = usePlayerUI()

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <div className="aspect-square rounded-lg border border-gray-600 relative overflow-hidden">
        {/* Image layer - fills container */}
        <div className="absolute inset-0 flex items-center justify-center">
          {activeNPC ? (
            activeNPC.image_url ? (
              <img 
                src={activeNPC.image_url} 
                alt={activeNPC.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className={`w-32 h-32 ${getRarityColor(activeNPC.rarity)} rounded-full flex items-center justify-center text-7xl`}>
                  👤
                </div>
              </div>
            )
          ) : (
            currentLocation.image_url ? (
              <img 
                src={currentLocation.image_url} 
                alt={currentLocation.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-6xl">{currentLocation.own_attributes?.emoji?.value || '📍'}</div>
              </div>
            )
          )}
        </div>
        
        {/* Text overlay layer - centered with rounded grey background */}
        <div className="absolute bottom-4 left-4 right-4 bg-gray-800 px-4 py-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(31, 41, 55, 0.8)' }}>
          {activeNPC ? (
            <>
              <div className="text-xl font-bold text-white">{activeNPC.name}</div>
              <div className="text-sm text-gray-300">Talking...</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-white">{currentLocation.name}</div>
              <div className="text-xs text-gray-300">
                ({currentLocation.x}, {currentLocation.y}) in {currentLocation.region}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameDisplay

