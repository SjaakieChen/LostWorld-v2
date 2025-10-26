import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { GameConfiguration, GeneratedEntities, PlayerCharacter } from '../services/game-orchestrator/types'
import { generateGameConfiguration, generateGameEntities } from '../services/game-orchestrator'
import { createPlayer } from '../services/game-orchestrator/player-creation'

type GameState = 'not_started' | 'generating' | 'ready' | 'playing'

interface GameStateContextType {
  gameState: GameState
  generatedData: {
    config: GameConfiguration | null
    entities: GeneratedEntities | null
    player: PlayerCharacter | null
  }
  generationProgress: string
  startGeneration: (characterName: string, description: string, artStyle: string) => Promise<void>
  startGame: () => void
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined)

export const useGameState = () => {
  const context = useContext(GameStateContext)
  if (!context) {
    throw new Error('useGameState must be used within GameStateProvider')
  }
  return context
}

interface GameStateProviderProps {
  children: ReactNode
}

export const GameStateProvider = ({ children }: GameStateProviderProps) => {
  const [gameState, setGameState] = useState<GameState>('not_started')
  const [generatedData, setGeneratedData] = useState<{
    config: GameConfiguration | null
    entities: GeneratedEntities | null
    player: PlayerCharacter | null
  }>({
    config: null,
    entities: null,
    player: null
  })
  const [generationProgress, setGenerationProgress] = useState('')

  const startGeneration = async (characterName: string, description: string, artStyle: string) => {
    setGameState('generating')
    setGenerationProgress('Starting game generation...')

    try {
      // Step 1: Generate game configuration
      setGenerationProgress('🎮 Generating game configuration with Gemini 2.5 Pro...')
      console.log('Calling generateGameConfiguration...')
      
      const config = await generateGameConfiguration(characterName, description, artStyle)
      console.log('✓ Configuration generated:', config)
      setGenerationProgress('✓ Configuration complete! Generating entities...')

      // Step 2 & 3: Generate entities and player character in parallel
      const totalEntities = config.entitiesToGenerate.regions.length + 
                           config.entitiesToGenerate.locations.length + 
                           config.entitiesToGenerate.npcs.length + 
                           config.entitiesToGenerate.items.length
      
      setGenerationProgress(`✨ Generating ${totalEntities} entities and player character (this may take 5-10 minutes)...`)
      console.log('Calling generateGameEntities and createPlayer in parallel...')
      
      const [entities, player] = await Promise.all([
        generateGameEntities(config),
        createPlayer(
          characterName,
          description,
          config.playerStats,
          config.gameRules,
          config.startingLocation
        )
      ])
      
      console.log('✓ Entities generated:', entities)
      console.log('✅ Player created:', player.name)
      console.log('📍 Starting location:', player.startingLocation)
      console.log('📊 Player stats:', Object.keys(player.stats))
      console.log('💪 Player status:', player.status)

      setGenerationProgress('✅ Generation complete!')

      // Store all generated data
      setGeneratedData({
        config,
        entities,
        player
      })

      setGameState('ready')
    } catch (error: any) {
      console.error('❌ Generation failed:', error)
      setGenerationProgress(`Error: ${error.message}`)
      
      // Still transition to game with partial data if we have config
      if (generatedData.config) {
        console.log('⚠️ Transitioning to game with partial data')
        setGameState('ready')
      } else {
        setGameState('not_started')
        throw error
      }
    }
  }

  const startGame = () => {
    setGameState('playing')
  }

  return (
    <GameStateContext.Provider value={{
      gameState,
      generatedData,
      generationProgress,
      startGeneration,
      startGame
    }}>
      {children}
    </GameStateContext.Provider>
  )
}

