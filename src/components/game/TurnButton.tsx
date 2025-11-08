import { useState } from 'react'
import { useGameState } from '../../context/GameStateContext'
import { usePlayerUI } from '../../context/PlayerUIContext'
import { useEntityStorage } from '../../context/EntityMemoryStorage'
import { turnProgressionLLM } from '../../services/turn-progression'

const TurnButton = () => {
  const { gameState, generatedData, updateTimeline } = useGameState()
  const { 
    currentTurn, 
    incrementTurn, 
    currentLocation,
    playerStats,
    playerStatus,
    updatePlayerStatus,
    increasePlayerStat
  } = usePlayerUI()
  const {
    allItems,
    allNPCs,
    allLocations,
    updateEntity,
    addEntity,
    getAllItemById,
    getAllNPCById,
    getAllLocationById
  } = useEntityStorage()
  
  const [isProcessing, setIsProcessing] = useState(false)

  // Only show when game is playing
  if (gameState !== 'playing') {
    return null
  }

  const handleTurnIncrement = async () => {
    // Prevent multiple calls
    if (isProcessing) {
      return
    }
    
    setIsProcessing(true)
    
    try {
      // Store the turn that is ending (current turn before increment)
      const endingTurn = currentTurn
      
      if (!generatedData.config) {
        console.warn('Cannot process turn progression: game config not available')
        // Still increment turn even if progression fails
        incrementTurn()
        return
      }
      
      // Build entity summary
      const entitySummary = turnProgressionLLM.buildEntitySummary(
        allItems,
        allNPCs,
        allLocations
      )
      
      // Build callbacks
      const callbacks = {
        updateEntity,
        addEntity,
        getAllItemById,
        getAllNPCById,
        getAllLocationById,
        updatePlayerStatus: (healthDelta: number, energyDelta: number, changeReason: string) => {
          updatePlayerStatus(healthDelta, energyDelta, changeReason)
        },
        updatePlayerStat: (statName: string, delta: number, changeReason: string) => {
          console.log(`Stat update: ${statName} ${delta > 0 ? '+' : ''}${delta} - ${changeReason}`)
          increasePlayerStat(statName, delta)
        },
        updateTimeline
      }
      
      // Process turn progression for the turn that is ending
      await turnProgressionLLM.processTurnProgression(
        generatedData.config,
        generatedData.config.theTimeline,
        endingTurn, // Pass the turn that just ended
        entitySummary,
        currentLocation,
        playerStats,
        playerStatus,
        callbacks
      )
      
      console.log('Turn progression processed successfully')
      
      // Increment turn after processing completes successfully
      incrementTurn()
    } catch (error) {
      console.error('Turn progression failed:', error)
      // Still increment turn even if progression fails
      incrementTurn()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <button
        onClick={handleTurnIncrement}
        disabled={isProcessing}
        className={`px-4 py-2 text-white font-semibold rounded-lg transition-colors ${
          isProcessing 
            ? 'bg-gray-600 cursor-not-allowed opacity-50' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isProcessing ? 'Processing...' : `Turn: ${currentTurn}`}
      </button>
    </div>
  )
}

export default TurnButton

