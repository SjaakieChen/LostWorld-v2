import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { GameConfiguration, GeneratedEntities, PlayerCharacter } from '../services/game-orchestrator/types'
import { generateGameConfiguration, generateGameEntities } from '../services/game-orchestrator'
import { createPlayer } from '../services/game-orchestrator/player-creation'
import type { SaveGameData, PlayerUIStateSnapshot } from '../services/save-game'

// Conditionally import dev dashboard services (only in development)
let cachedStateBroadcaster: any = null
let broadcasterPromise: Promise<any> | null = null

const getStateBroadcaster = async () => {
  if (!import.meta.env.DEV) return null
  if (cachedStateBroadcaster) return cachedStateBroadcaster
  if (!broadcasterPromise) {
    broadcasterPromise = import('../dev-dashboard/state-broadcaster').then(module => {
      cachedStateBroadcaster = module.stateBroadcaster
      return cachedStateBroadcaster
    })
  }
  return broadcasterPromise
}

const getStateBroadcasterSync = () => cachedStateBroadcaster

type GameState = 'not_started' | 'generating' | 'ready' | 'playing'

interface GameStateContextType {
  gameState: GameState
  generatedData: {
    config: GameConfiguration | null
    entities: GeneratedEntities | null
    player: PlayerCharacter | null
  }
  generationProgress: string
  loadedSaveData: {
    entities: SaveGameData['entities'] | null
    playerState: PlayerUIStateSnapshot | null
  }
  startGeneration: (characterName: string, description: string, artStyle: string) => Promise<void>
  startGame: () => void
  loadGame: (saveData: SaveGameData) => void
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
  const [loadedSaveData, setLoadedSaveData] = useState<{
    entities: SaveGameData['entities'] | null
    playerState: PlayerUIStateSnapshot | null
  }>({
    entities: null,
    playerState: null
  })
  // Store orchestrator operations history for re-broadcasting on sync requests
  const [orchestratorOperations, setOrchestratorOperations] = useState<Array<{
    operationId: string
    operationType: string
    timestamp: number
    input?: any
    output?: any
    duration?: number
    success: boolean
    error?: string
  }>>([])

  // Preload dev dashboard services in DEV mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      getStateBroadcaster()
    }
  }, [])

  const startGeneration = async (characterName: string, description: string, artStyle: string) => {
    setGameState('generating')
    setGenerationProgress('Starting game generation...')

    const operationStartTime = performance.now()
    const broadcaster = getStateBroadcasterSync()

    try {
      // Step 1: Generate game configuration
      setGenerationProgress('🎮 Generating game configuration with Gemini 2.5 Pro...')
      console.log('Calling generateGameConfiguration...')
      
      const configStartTime = performance.now()
      const config = await generateGameConfiguration(characterName, description, artStyle)
      const configDuration = performance.now() - configStartTime
      
      console.log('✓ Configuration generated:', config)
      setGenerationProgress('✓ Configuration complete! Generating entities...')

      // Broadcast orchestrator operation for config generation
      if (import.meta.env.DEV && broadcaster) {
        const operationId = `op_${Date.now()}_1`
        const operation = {
          operationId,
          operationType: 'initial_generation',
          timestamp: Date.now(),
          input: { characterName, description, artStyle },
          output: config,
          duration: configDuration,
          success: true
        }
        
        console.log('[Dev Dashboard] Broadcasting orchestrator operation: initial_generation (config)', operation)
        broadcaster.broadcastOrchestratorOperation('initial_generation', {
          input: { characterName, description, artStyle },
          output: config,
          duration: configDuration,
          success: true
        })
        
        // Store operation in history
        setOrchestratorOperations(prev => {
          const updated = [...prev.slice(-19), operation] // Keep last 20
          console.log(`[Dev Dashboard] Stored operation. Total operations: ${updated.length}`)
          return updated
        })

        // Broadcast scratchpad update (initial)
        console.log('[Dev Dashboard] Broadcasting scratchpad update (initial)', { scratchpadLength: config.scratchpad?.length || 0 })
        broadcaster.broadcastScratchpadUpdate(
          null,
          config.scratchpad,
          'initial',
          'Initial game configuration generated'
        )
      }

      // Step 2 & 3: Generate entities and player character in parallel
      const totalEntities = config.entitiesToGenerate.regions.length + 
                           config.entitiesToGenerate.locations.length + 
                           config.entitiesToGenerate.npcs.length + 
                           config.entitiesToGenerate.items.length
      
      setGenerationProgress(`✨ Generating ${totalEntities} entities and player character (this may take 5-10 minutes)...`)
      console.log('Calling generateGameEntities and createPlayer in parallel...')
      
      const entityGenStartTime = performance.now()
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
      const entityGenDuration = performance.now() - entityGenStartTime
      
      console.log('✓ Entities generated:', entities)
      console.log('✅ Player created:', player.name)
      console.log('📍 Starting location:', player.startingLocation)
      console.log('📊 Player stats:', Object.keys(player.stats))
      console.log('💪 Player status:', player.status)

      setGenerationProgress('✅ Generation complete!')

      const totalDuration = performance.now() - operationStartTime

      // Broadcast orchestrator operations for entity generation
      if (import.meta.env.DEV && broadcaster) {
        // Entity generation operation
        const entityOp = {
          operationId: `op_${Date.now()}_2`,
          operationType: 'entity_generation',
          timestamp: Date.now(),
          input: { config },
          output: entities,
          duration: entityGenDuration,
          success: true
        }
        broadcaster.broadcastOrchestratorOperation('entity_generation', {
          input: { config },
          output: entities,
          duration: entityGenDuration,
          success: true
        })
        setOrchestratorOperations(prev => [...prev.slice(-19), entityOp])

        // Player creation operation
        const playerOp = {
          operationId: `op_${Date.now()}_3`,
          operationType: 'player_creation',
          timestamp: Date.now(),
          input: { characterName, description, config: { playerStats: config.playerStats, gameRules: config.gameRules, startingLocation: config.startingLocation } },
          output: player,
          duration: entityGenDuration,
          success: true
        }
        broadcaster.broadcastOrchestratorOperation('player_creation', {
          input: { characterName, description, config: { playerStats: config.playerStats, gameRules: config.gameRules, startingLocation: config.startingLocation } },
          output: player,
          duration: entityGenDuration,
          success: true
        })
        setOrchestratorOperations(prev => [...prev.slice(-19), playerOp])

        // Broadcast complete operation (update the initial one)
        const completeOp = {
          operationId: `op_${Date.now()}_4`,
          operationType: 'initial_generation',
          timestamp: Date.now(),
          input: { characterName, description, artStyle },
          output: { config, entities, player },
          duration: totalDuration,
          success: true
        }
        broadcaster.broadcastOrchestratorOperation('initial_generation', {
          input: { characterName, description, artStyle },
          output: { config, entities, player },
          duration: totalDuration,
          success: true
        })
        setOrchestratorOperations(prev => [...prev.slice(-19), completeOp])
      }

      // SOURCE OF TRUTH: Store all generated data
      setGeneratedData({
        config,
        entities,
        player
      })

      setGameState('ready')
    } catch (error: any) {
      console.error('❌ Generation failed:', error)
      setGenerationProgress(`Error: ${error.message}`)
      
      const totalDuration = performance.now() - operationStartTime
      
      // Broadcast failed operation
      if (import.meta.env.DEV && broadcaster) {
        const failedOp = {
          operationId: `op_${Date.now()}_error`,
          operationType: 'initial_generation',
          timestamp: Date.now(),
          input: { characterName, description, artStyle },
          duration: totalDuration,
          success: false,
          error: error.message || 'Unknown error'
        }
        broadcaster.broadcastOrchestratorOperation('initial_generation', {
          input: { characterName, description, artStyle },
          duration: totalDuration,
          success: false,
          error: error.message || 'Unknown error'
        })
        setOrchestratorOperations(prev => [...prev.slice(-19), failedOp])
      }
      
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

  const loadGame = (saveData: SaveGameData) => {
    // Restore game configuration and player character
    setGeneratedData({
      config: saveData.gameConfig,
      entities: null, // Use current entity state from save instead
      player: saveData.playerCharacter
    })

    // Store loaded entity data and player state for child contexts
    setLoadedSaveData({
      entities: saveData.entities,
      playerState: {
        inventorySlots: saveData.playerState.inventorySlots,
        equipmentSlots: saveData.playerState.equipmentSlots,
        interactionInputSlots: saveData.playerState.interactionInputSlots,
        interactionOutputSlots: saveData.playerState.interactionOutputSlots,
        currentLocationId: saveData.playerState.currentLocationId,
        currentRegionId: saveData.playerState.currentRegionId,
        exploredLocationIds: saveData.playerState.exploredLocationIds,
        playerStats: saveData.playerState.playerStats,
        playerStatus: saveData.playerState.playerStatus,
        currentTurn: saveData.playerState.currentTurn ?? 0  // Default to 0 for backward compatibility
      }
    })

    // Set game state to ready, then playing (same flow as new game)
    setGameState('ready')
    // Auto-start will happen via useEffect in CharacterCreationScreen
  }

  // Listen for sync requests from dashboard and respond immediately
  useEffect(() => {
    if (!import.meta.env.DEV) return

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('lostworld-dev-dashboard')
    } catch (error) {
      console.warn('[Dev Dashboard] Failed to create BroadcastChannel for sync listener in GameStateContext:', error)
      return
    }

    const handleSyncRequest = (event: MessageEvent) => {
      const message = event.data
      if (message?.type === 'SYNC_REQUEST') {
        const broadcaster = getStateBroadcasterSync()
        if (broadcaster) {
          // Immediately broadcast full game state
          broadcaster.broadcastGameState({
            gameState,
            generationProgress,
            config: generatedData.config ? {
              scratchpad: generatedData.config.scratchpad,
              gameRules: generatedData.config.gameRules,
              playerStats: generatedData.config.playerStats,
              startingLocation: generatedData.config.startingLocation,
              entitiesToGenerate: generatedData.config.entitiesToGenerate
            } : null,
            player: generatedData.player
          })
          
          // Broadcast scratchpad if available
          if (generatedData.config?.scratchpad) {
            broadcaster.broadcastScratchpadUpdate(
              null,
              generatedData.config.scratchpad,
              generatedData.config ? 'update' : 'initial',
              'Sync request - full state broadcast'
            )
          }
          
          // Re-broadcast all stored orchestrator operations
          console.log(`[Dev Dashboard] Sync request: Re-broadcasting ${orchestratorOperations.length} stored operations`)
          orchestratorOperations.forEach((op, index) => {
            console.log(`[Dev Dashboard] Re-broadcasting operation ${index + 1}/${orchestratorOperations.length}:`, op.operationType)
            broadcaster.broadcastOrchestratorOperation(op.operationType, {
              input: op.input,
              output: op.output,
              duration: op.duration,
              success: op.success,
              error: op.error
            })
          })
          
          console.log(`[Dev Dashboard] Sync request complete: game state and ${orchestratorOperations.length} operations broadcast sent`)
        }
      }
    }

    channel.onmessage = handleSyncRequest

    return () => {
      channel?.close()
    }
  }, [gameState, generationProgress, generatedData, orchestratorOperations])

  // Broadcast game state changes (only in DEV)
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const broadcaster = getStateBroadcasterSync()
    if (!broadcaster) {
      console.warn('[Dev Dashboard] Broadcaster not available for game state update')
      return
    }

    console.log('[Dev Dashboard] Broadcasting game state update:', { gameState, hasConfig: !!generatedData.config })
    broadcaster.broadcastGameState({
      gameState,
      generationProgress,
      config: generatedData.config ? {
        scratchpad: generatedData.config.scratchpad,
        gameRules: generatedData.config.gameRules,
        playerStats: generatedData.config.playerStats,
        startingLocation: generatedData.config.startingLocation,
        entitiesToGenerate: generatedData.config.entitiesToGenerate
      } : null,
      player: generatedData.player
    })

    // Broadcast scratchpad update if config changed
    if (generatedData.config?.scratchpad) {
      console.log('[Dev Dashboard] Broadcasting scratchpad update (game state change)')
      broadcaster.broadcastScratchpadUpdate(
        null, // Previous scratchpad not tracked here
        generatedData.config.scratchpad,
        generatedData.config ? 'update' : 'initial',
        'Game state update'
      )
    }
  }, [gameState, generationProgress, generatedData])

  return (
    <GameStateContext.Provider value={{
      gameState,
      generatedData,
      generationProgress,
      loadedSaveData,
      startGeneration,
      startGame,
      loadGame
    }}>
      {children}
    </GameStateContext.Provider>
  )
}

