import type { GameConfiguration, PlayerCharacter } from './game-orchestrator/types'
import type { Item, NPC, Location, Region } from '../types'
import type { PlayerStats, PlayerStatus } from './entity-generation/types'

/**
 * Save Game Data Structure
 * 
 * Contains all necessary game state to restore a saved game.
 */
export interface SaveGameData {
  version: string
  timestamp: number
  gameConfig: GameConfiguration
  playerCharacter: PlayerCharacter
  entities: {
    items: Item[]
    locations: Location[]
    npcs: NPC[]
    regions: Region[]
  }
  playerState: {
    inventorySlots: Record<string, string | null>
    equipmentSlots: Record<string, string | null>
    interactionInputSlots: Record<string, string | null>
    interactionOutputSlots: Record<string, string | null>
    currentLocationId: string
    currentRegionId: string
    exploredLocationIds: string[]  // Array (Set is not JSON serializable)
    playerStats: PlayerStats
    playerStatus: PlayerStatus
    currentTurn?: number  // Optional for backward compatibility with old save files
  }
}

/**
 * Entity Storage State Snapshot
 */
export interface EntityStorageSnapshot {
  allItems: Item[]
  allLocations: Location[]
  allNPCs: NPC[]
  allRegions: Region[]
}

/**
 * Player UI State Snapshot
 */
export interface PlayerUIStateSnapshot {
  inventorySlots: Record<string, string | null>
  equipmentSlots: Record<string, string | null>
  interactionInputSlots: Record<string, string | null>
  interactionOutputSlots: Record<string, string | null>
  currentLocationId: string
  currentRegionId: string
  exploredLocationIds: string[]
  playerStats: PlayerStats
  playerStatus: PlayerStatus
  currentTurn: number
}

const SAVE_VERSION = '1.0'

/**
 * Serialize complete game state to SaveGameData
 */
export function serializeGameState(
  gameConfig: GameConfiguration,
  playerCharacter: PlayerCharacter,
  entitySnapshot: EntityStorageSnapshot,
  playerSnapshot: PlayerUIStateSnapshot
): SaveGameData {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    gameConfig,
    playerCharacter,
    entities: {
      items: entitySnapshot.allItems,
      locations: entitySnapshot.allLocations,
      npcs: entitySnapshot.allNPCs,
      regions: entitySnapshot.allRegions
    },
    playerState: {
      inventorySlots: playerSnapshot.inventorySlots,
      equipmentSlots: playerSnapshot.equipmentSlots,
      interactionInputSlots: playerSnapshot.interactionInputSlots,
      interactionOutputSlots: playerSnapshot.interactionOutputSlots,
      currentLocationId: playerSnapshot.currentLocationId,
      currentRegionId: playerSnapshot.currentRegionId,
      exploredLocationIds: playerSnapshot.exploredLocationIds,
      playerStats: playerSnapshot.playerStats,
      playerStatus: playerSnapshot.playerStatus,
      currentTurn: playerSnapshot.currentTurn
    }
  }
}

/**
 * Deserialize and validate SaveGameData from JSON
 */
export function deserializeGameState(json: string): SaveGameData {
  try {
    const data = JSON.parse(json) as SaveGameData

    // Validate required fields
    if (!data.version) {
      throw new Error('Invalid save file: missing version')
    }
    if (!data.gameConfig) {
      throw new Error('Invalid save file: missing gameConfig')
    }

    // Validate gameConfig structure, including scratchpad and timeline
    // Handle backward compatibility for old save files
    if (typeof data.gameConfig.theGuideScratchpad !== 'string') {
      if (data.gameConfig.theGuideScratchpad === undefined) {
        // Backward compatibility: initialize with empty string if missing
        data.gameConfig.theGuideScratchpad = ''
      } else {
        throw new Error('Invalid save file: gameConfig.theGuideScratchpad must be a string')
      }
    }
    if (!Array.isArray(data.gameConfig.theTimeline)) {
      if (data.gameConfig.theTimeline === undefined) {
        // Backward compatibility: initialize with empty array if missing
        data.gameConfig.theTimeline = []
      } else {
        throw new Error('Invalid save file: gameConfig.theTimeline must be an array')
      }
    }

    if (!data.playerCharacter) {
      throw new Error('Invalid save file: missing playerCharacter')
    }
    if (!data.entities) {
      throw new Error('Invalid save file: missing entities')
    }
    if (!data.playerState) {
      throw new Error('Invalid save file: missing playerState')
    }

    // Validate entity structure
    if (!Array.isArray(data.entities.items)) {
      throw new Error('Invalid save file: entities.items must be an array')
    }
    if (!Array.isArray(data.entities.locations)) {
      throw new Error('Invalid save file: entities.locations must be an array')
    }
    if (!Array.isArray(data.entities.npcs)) {
      throw new Error('Invalid save file: entities.npcs must be an array')
    }
    if (!Array.isArray(data.entities.regions)) {
      throw new Error('Invalid save file: entities.regions must be an array')
    }

    // Validate player state structure
    if (!data.playerState.currentLocationId) {
      throw new Error('Invalid save file: playerState.currentLocationId is missing')
    }
    if (!data.playerState.currentRegionId) {
      throw new Error('Invalid save file: playerState.currentRegionId is missing')
    }
    if (!Array.isArray(data.playerState.exploredLocationIds)) {
      throw new Error('Invalid save file: playerState.exploredLocationIds must be an array')
    }
    if (!data.playerState.playerStats) {
      throw new Error('Invalid save file: playerState.playerStats is missing')
    }
    if (!data.playerState.playerStatus) {
      throw new Error('Invalid save file: playerState.playerStatus is missing')
    }

    return data
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid save file: corrupted JSON data')
    }
    throw error
  }
}

/**
 * Download save file to user's computer
 */
export function downloadSaveFile(saveData: SaveGameData, filename?: string): void {
  const json = JSON.stringify(saveData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `lostworld-save-${new Date().toISOString().slice(0, 10)}.lwg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

