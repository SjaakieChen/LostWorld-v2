import { useState } from 'react'
import { useGameState } from '../../context/GameStateContext'
import { useEntityStorage } from '../../context/EntityMemoryStorage'
import { usePlayerUI } from '../../context/PlayerUIContext'
import { serializeGameState, downloadSaveFile } from '../../services/save-game'

const SaveGameButton = () => {
  const { gameState, generatedData } = useGameState()
  const { getStateSnapshot: getEntitySnapshot } = useEntityStorage()
  const { getStateSnapshot: getPlayerSnapshot } = usePlayerUI()
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const handleSave = () => {
    if (!generatedData.config || !generatedData.player) {
      setSaveMessage('Error: Game data not ready')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Collect state from all contexts
      const entitySnapshot = getEntitySnapshot()
      const playerSnapshot = getPlayerSnapshot()

      // Serialize game state
      const saveData = serializeGameState(
        generatedData.config,
        generatedData.player,
        entitySnapshot,
        playerSnapshot
      )

      // Download save file
      const filename = `lostworld-${generatedData.player.name}-${new Date().toISOString().slice(0, 10)}.lwg`
      downloadSaveFile(saveData, filename)

      setSaveMessage('Game saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error: any) {
      console.error('Error saving game:', error)
      setSaveMessage(`Error: ${error.message || 'Failed to save game'}`)
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Only show when game is playing
  if (gameState !== 'playing') {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isSaving ? 'Saving...' : '💾 Save Game'}
      </button>
      {saveMessage && (
        <div className={`absolute top-full left-0 mt-2 px-3 py-2 rounded text-sm whitespace-nowrap z-50 ${
          saveMessage.includes('Error') 
            ? 'bg-red-900 text-red-100 border border-red-700' 
            : 'bg-green-900 text-green-100 border border-green-700'
        }`}>
          {saveMessage}
        </div>
      )}
    </div>
  )
}

export default SaveGameButton

