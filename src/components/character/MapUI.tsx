import { usePlayerUI } from '../../context/PlayerUIContext'
import EntityModal from '../common/EntityModal'

const MapUI = () => {
  const { 
    currentLocation, 
    currentRegion, 
    allLocations, 
    allRegions,
    exploredLocations, 
    moveToLocation,
    changeRegion,
    getLocationAt,
    selectedEntity,
    setSelectedEntity
  } = usePlayerUI()

  const gridSize = 5  // 5x5 grid
  const centerOffset = Math.floor(gridSize / 2)  // 2 for 5x5

  // Calculate grid coordinates centered on player
  const gridRows: number[][] = []
  for (let dy = -centerOffset; dy <= centerOffset; dy++) {
    const row: number[] = []
    for (let dx = -centerOffset; dx <= centerOffset; dx++) {
      row.push(currentLocation.x + dx)
      row.push(currentLocation.y + dy)
    }
    gridRows.push(row)
  }

  // Check if region exists in a direction
  const hasRegion = (direction: 'north' | 'south' | 'east' | 'west') => {
    const directionMap = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 }
    }
    const offset = directionMap[direction]
    return allRegions.some(
      r => r.regionX === currentRegion.regionX + offset.dx && 
           r.regionY === currentRegion.regionY + offset.dy
    )
  }

  const handleCellClick = (x: number, y: number, e: React.MouseEvent) => {
    const location = getLocationAt(x, y, currentLocation.region)
    const isExplored = location && exploredLocations.has(location.id)
    
    // Right click or Ctrl+click shows details for explored locations
    if ((e.ctrlKey || e.button === 2) && isExplored && location) {
      e.preventDefault()
      setSelectedEntity(location)
      return
    }

    // Check if adjacent (Manhattan distance = 1)
    const distance = Math.abs(x - currentLocation.x) + Math.abs(y - currentLocation.y)
    if (distance !== 1) {
      // If not adjacent but explored, show details on click
      if (isExplored && location) {
        setSelectedEntity(location)
      }
      return  // Not adjacent, can't move
    }

    // Find location at these coordinates and move
    if (location) {
      moveToLocation(location)
    }
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">Map</h2>
        <span className="text-xs text-gray-400">{currentRegion.name}</span>
      </div>

      {/* Region Navigation - North */}
      <div className="flex justify-center mb-1">
        {hasRegion('north') && (
          <button
            onClick={() => changeRegion('north')}
            className="bg-gray-800 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs transition-colors"
            title="Change to northern region"
          >
            ↑ North
          </button>
        )}
      </div>

      {/* Map Grid with West/East arrows */}
      <div className="flex items-center gap-1">
        {/* West Arrow */}
        <div className="w-8">
          {hasRegion('west') && (
            <button
              onClick={() => changeRegion('west')}
              className="bg-gray-800 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs transition-colors"
              title="Change to western region"
            >
              ←
            </button>
          )}
        </div>

        {/* 5x5 Grid */}
        <div className="flex-1 bg-gray-800 rounded p-2 border border-gray-600">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: gridSize }).map((_, rowIdx) => {
              return Array.from({ length: gridSize }).map((_, colIdx) => {
                const dx = colIdx - centerOffset
                const dy = rowIdx - centerOffset
                const x = currentLocation.x + dx
                const y = currentLocation.y + dy
                
                const isCurrent = dx === 0 && dy === 0
                const isAdjacent = Math.abs(dx) + Math.abs(dy) === 1
                
                const location = getLocationAt(x, y, currentLocation.region)
                const isExplored = location && exploredLocations.has(location.id)
                
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    onClick={(e) => handleCellClick(x, y, e)}
                    onContextMenu={(e) => handleCellClick(x, y, e)}
                    className={`aspect-square rounded flex items-center justify-center text-2xl transition-all ${
                      isCurrent
                        ? 'bg-blue-600 ring-2 ring-blue-400 cursor-default'
                        : isAdjacent
                        ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                        : isExplored
                        ? 'bg-gray-900 cursor-pointer hover:bg-gray-850'
                        : 'bg-gray-900 cursor-default'
                    } ${isExplored ? 'border border-gray-500' : ''}`}
                    title={isExplored ? `${location?.name} (click for details)` : `(${x}, ${y})`}
                  >
                    {isExplored && location?.image_url ? (
                      <img 
                        src={location.image_url} 
                        alt={location.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : isExplored && location?.own_attributes?.emoji?.value ? (
                      <span className="text-sm">{location.own_attributes.emoji.value}</span>
                    ) : !isExplored ? (
                      <span className="text-xs text-gray-600">?</span>
                    ) : null}
                  </div>
                )
              })
            })}
          </div>
        </div>

        {/* East Arrow */}
        <div className="w-8">
          {hasRegion('east') && (
            <button
              onClick={() => changeRegion('east')}
              className="bg-gray-800 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs transition-colors"
              title="Change to eastern region"
            >
              →
            </button>
          )}
        </div>
      </div>

      {/* Region Navigation - South */}
      <div className="flex justify-center mt-1">
        {hasRegion('south') && (
          <button
            onClick={() => changeRegion('south')}
            className="bg-gray-800 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs transition-colors"
            title="Change to southern region"
          >
            ↓ South
          </button>
        )}
      </div>

      {/* Coordinates Display */}
      <div className="mt-2 text-center text-xs text-gray-500">
        Position: ({currentLocation.x}, {currentLocation.y})
      </div>

      {/* Entity Detail Modal */}
      <EntityModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
    </div>
  )
}

export default MapUI

