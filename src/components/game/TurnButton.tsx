import { useGameState } from '../../context/GameStateContext'
import { usePlayerUI } from '../../context/PlayerUIContext'

const TurnButton = () => {
  const { gameState } = useGameState()
  const { currentTurn, incrementTurn } = usePlayerUI()

  // Only show when game is playing
  if (gameState !== 'playing') {
    return null
  }

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <button
        onClick={incrementTurn}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
      >
        Turn: {currentTurn}
      </button>
    </div>
  )
}

export default TurnButton

