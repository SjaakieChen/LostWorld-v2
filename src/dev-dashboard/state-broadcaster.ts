/**
 * State Broadcaster
 * 
 * Broadcasts game state changes to developer dashboard via BroadcastChannel API.
 * Only active in development mode.
 * Used by game contexts to send updates to dashboard.
 * Dashboard listens to these broadcasts (separate instance).
 */

export type DashboardMessageType =
  | 'GAME_STATE'
  | 'ENTITY_STORAGE'
  | 'ENTITY_CHANGE'
  | 'PLAYER_UI'
  | 'ORCHESTRATOR_OPERATION'
  | 'SCRATCHPAD_UPDATE'
  | 'ENTITY_HISTORY'
  | 'SYNC_REQUEST'
  | 'DASHBOARD_COMMAND'

interface BaseDashboardMessage {
  type: DashboardMessageType
  timestamp: number
  version?: string
}

export interface GameStateMessage extends BaseDashboardMessage {
  type: 'GAME_STATE'
  data: {
    gameState: 'not_started' | 'generating' | 'ready' | 'playing'
    generationProgress: string
    config: {
      theGuideScratchpad: string
      theTimeline: any[]
      gameRules: any
      playerStats: any
      startingLocation: any
      entitiesToGenerate: any
    } | null
    player: any | null
  }
}

export interface EntityStorageMessage extends BaseDashboardMessage {
  type: 'ENTITY_STORAGE'
  data: {
    allItems: any[]
    allLocations: any[]
    allNPCs: any[]
    allRegions: any[]
    entityMapSize: number
    counts: {
      items: number
      locations: number
      npcs: number
      regions: number
    }
  }
}

export interface EntityChangeMessage extends BaseDashboardMessage {
  type: 'ENTITY_CHANGE'
  data: {
    entityId: string
    entityType: 'item' | 'npc' | 'location' | 'region'
    previousState: any | null
    newState: any
    changeSource: 'player_action' | 'orchestrator' | 'system' | 'manual'
    reason?: string
    timestamp: number
  }
}

export interface PlayerUIMessage extends BaseDashboardMessage {
  type: 'PLAYER_UI'
  data: {
    currentLocation: any
    currentRegion: any
    inventorySlots: Record<string, string | null>
    equipmentSlots: Record<string, string | null>
    playerStats: any
    playerStatus: any
    exploredLocationsCount: number
    activeNPC: any | null
  }
}

export interface OrchestratorOperationMessage extends BaseDashboardMessage {
  type: 'ORCHESTRATOR_OPERATION'
  data: {
    operationId: string
    operationType: string
    input?: any
    output?: any
    duration?: number
    success: boolean
    error?: string
  }
}

export interface GuideScratchpadUpdateMessage extends BaseDashboardMessage {
  type: 'GUIDE_SCRATCHPAD_UPDATE'
  data: {
    previousGuideScratchpad: string | null
    newGuideScratchpad: string
    changeType: 'initial' | 'update' | 'append' | 'rewrite'
    reason?: string
  }
}

export interface EntityHistoryMessage extends BaseDashboardMessage {
  type: 'ENTITY_HISTORY'
  data: {
    entityId: string
    entityType: 'item' | 'npc' | 'location' | 'region'
    history: any[]  // Array of EntityHistoryEntry
  }
}

export interface SyncRequestMessage extends BaseDashboardMessage {
  type: 'SYNC_REQUEST'
  data: {
    requesterId: string // Dashboard instance ID
    timestamp: number
  }
}

export interface DashboardCommandMessage extends BaseDashboardMessage {
  type: 'DASHBOARD_COMMAND'
  data: {
    commandType: 'CHANGE_LOCATION'
    locationId: string
  }
}

export type DashboardMessage =
  | GameStateMessage
  | EntityStorageMessage
  | EntityChangeMessage
  | PlayerUIMessage
  | OrchestratorOperationMessage
  | GuideScratchpadUpdateMessage
  | EntityHistoryMessage
  | SyncRequestMessage
  | DashboardCommandMessage

class StateBroadcaster {
  private channel: BroadcastChannel | null = null
  private operationCounter = 0

  constructor() {
    // Only initialize in development mode
    if (import.meta.env.DEV) {
      try {
        this.channel = new BroadcastChannel('lostworld-dev-dashboard')
      } catch (error) {
        console.warn('[Dev Dashboard] BroadcastChannel not supported:', error)
      }
    }
  }

  private broadcast(message: DashboardMessage): void {
    if (!this.channel || !import.meta.env.DEV) {
      return
    }

    try {
      this.channel.postMessage(message)
    } catch (error) {
      console.warn('[Dev Dashboard] Broadcast failed:', error)
    }
  }

  /**
   * Broadcast game state updates
   */
  broadcastGameState(data: GameStateMessage['data']): void {
    this.broadcast({
      type: 'GAME_STATE',
      timestamp: Date.now(),
      data
    })
  }

  /**
   * Broadcast entity storage state
   */
  broadcastEntityStorage(data: EntityStorageMessage['data']): void {
    this.broadcast({
      type: 'ENTITY_STORAGE',
      timestamp: Date.now(),
      data: {
        ...data,
        entityMapSize: data.allItems?.length || 0, // Simplified for now
        counts: {
          items: data.allItems?.length || 0,
          locations: data.allLocations?.length || 0,
          npcs: data.allNPCs?.length || 0,
          regions: data.allRegions?.length || 0
        }
      }
    })
  }

  /**
   * Broadcast individual entity change
   */
  broadcastEntityChange(data: EntityChangeMessage['data']): void {
    this.broadcast({
      type: 'ENTITY_CHANGE',
      timestamp: Date.now(),
      data
    })
  }

  /**
   * Broadcast player UI state
   */
  broadcastPlayerUI(data: PlayerUIMessage['data']): void {
    this.broadcast({
      type: 'PLAYER_UI',
      timestamp: Date.now(),
      data
    })
  }

  /**
   * Broadcast orchestrator operation
   */
  broadcastOrchestratorOperation(
    operationType: string,
    data: {
      input?: any
      output?: any
      duration?: number
      success: boolean
      error?: string
      [key: string]: any
    }
  ): void {
    const operationId = `op_${Date.now()}_${++this.operationCounter}`

    this.broadcast({
      type: 'ORCHESTRATOR_OPERATION',
      timestamp: Date.now(),
      data: {
        operationId,
        operationType,
        ...data
      }
    })
  }

  /**
   * Broadcast guide scratchpad update
   */
  broadcastGuideScratchpadUpdate(
    previousGuideScratchpad: string | null,
    newGuideScratchpad: string,
    changeType: 'initial' | 'update' | 'append' | 'rewrite' = 'update',
    reason?: string
  ): void {
    this.broadcast({
      type: 'GUIDE_SCRATCHPAD_UPDATE',
      timestamp: Date.now(),
      data: {
        previousGuideScratchpad,
        newGuideScratchpad,
        changeType,
        reason
      }
    })
  }

  /**
   * Broadcast entity history for a specific entity
   */
  broadcastEntityHistory(
    entityId: string,
    entityType: 'item' | 'npc' | 'location' | 'region',
    history: any[]
  ): void {
    this.broadcast({
      type: 'ENTITY_HISTORY',
      timestamp: Date.now(),
      data: {
        entityId,
        entityType,
        history
      }
    })
  }

  /**
   * Close the broadcast channel
   */
  close(): void {
    this.channel?.close()
    this.channel = null
  }
}

// Singleton instance
export const stateBroadcaster = new StateBroadcaster()

