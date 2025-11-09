import { useState, useEffect, useRef } from 'react'
import { useGameState } from '../../context/GameStateContext'
import { deserializeGameState } from '../../services/save-game'

const CharacterCreationScreen = () => {
  const { gameState, generationProgress, startGeneration, startGame, loadGame } = useGameState()
  const isGenerating = gameState === 'generating'
  
  const [characterName, setCharacterName] = useState('')
  const [characterDescription, setCharacterDescription] = useState('')
  const [artStyle, setArtStyle] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleGenerate = async () => {
    if (!characterName || !characterDescription || !artStyle) {
      setError('Please fill in all fields')
      return
    }

    setError('')
    try {
      await startGeneration(characterName, characterDescription, artStyle)
    } catch (err: any) {
      setError(err.message || 'Generation failed')
    }
  }

  const handleLoadGameClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoadError('')

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      // Read file as text
      const text = await file.text()

      // Deserialize and validate save data
      const saveData = deserializeGameState(text)

      // Load game
      loadGame(saveData)
    } catch (err: any) {
      console.error('Error loading game:', err)
      setLoadError(err.message || 'Failed to load game file')
    }
  }

  // Automatically start the game when ready
  useEffect(() => {
    if (gameState === 'ready') {
      startGame()
    }
  }, [gameState, startGame])

  // Show loading screen during generation
  if (isGenerating) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-center mb-8 text-white">Creating Your Adventure</h1>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-300">{generationProgress}</p>
            </div>
            
            <div className="bg-gray-900 rounded p-4 text-sm text-gray-400 mt-6">
              <p>This process takes 5-10 minutes to generate:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Game configuration and rules</li>
                <li>Regions, locations, NPCs, and items</li>
                <li>Player character with full-body portrait</li>
              </ul>
              <p className="mt-3 text-xs">Please keep this window open...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show character creation form
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-white">Create Your Character</h1>
        <p className="text-center text-gray-400 mb-8">Generate a unique adventure with AI</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Character Name
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter character name..."
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Character Description
            </label>
            <textarea
              value={characterDescription}
              onChange={(e) => setCharacterDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Describe your character, their background, and the world you want to explore..."
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about the historical period, genre, and setting
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Art Style
            </label>
            <input
              type="text"
              value={artStyle}
              onChange={(e) => setArtStyle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., Medieval Fantasy, Ancient Greek, Cyberpunk..."
              disabled={isGenerating}
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100 text-sm">
              {error}
            </div>
          )}

          {loadError && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100 text-sm">
              Load Error: {loadError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !characterName || !characterDescription || !artStyle}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Adventure'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

            <button
              onClick={handleLoadGameClick}
              disabled={isGenerating}
              className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              📂 Load Saved Game
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".lwg"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterCreationScreen

