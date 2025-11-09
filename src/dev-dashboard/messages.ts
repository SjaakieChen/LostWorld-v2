export const DASHBOARD_CHANNEL_NAME = 'lostworld-dev-dashboard'

export interface MessageMeta {
  version?: string
  timestamp?: number
}

export interface GameStateData {
  gameState: 'not_started' | 'generating' | 'ready' | 'playing'
  generationProgress: string
  config: {
    theGuideScratchpad: string | null
    theTimeline: any[] | null
    gameRules: any | null
    playerStats: any | null
    startingLocation: any | null
    entitiesToGenerate: any | null
  } | null
  player: any | null
}

export interface EntityStorageData {
  allItems: any[]
  allLocations: any[]
  allNPCs: any[]
  allRegions: any[]
  entityMapSize?: number
  counts: {
    items: number
    locations: number
    npcs: number
    regions: number
  }
}

export interface EntityChangeData {
  entityId: string
  entityType: 'item' | 'npc' | 'location' | 'region'
  previousState: any | null
  newState: any
  changeSource: 'player_action' | 'orchestrator' | 'system' | 'manual'
  reason?: string
  timestamp: number
}

export interface PlayerUIData {
  currentLocation: any
  currentRegion: any
  inventorySlots: Record<string, string | null>
  equipmentSlots: Record<string, string | null>
  playerStats: any
  playerStatus: any
  exploredLocationsCount: number
  activeNPC: any | null
}

export interface OrchestratorOperationData {
  operationId: string
  operationType: string
  input?: any
  output?: any
  duration?: number
  success: boolean
  error?: string
  [key: string]: any
}

export interface GuideScratchpadUpdateData {
  previousGuideScratchpad: string | null
  newGuideScratchpad: string
  changeType: 'initial' | 'update' | 'append' | 'rewrite'
  reason?: string
}

export interface EntityHistoryData {
  entityId: string
  entityType: 'item' | 'npc' | 'location' | 'region'
  history: any[]
}

export interface SyncRequestData {
  requesterId: string
  timestamp: number
}

export interface DashboardCommandData {
  commandType: 'CHANGE_LOCATION'
  locationId: string
}

export type DashboardMessagePayloadMap = {
  GAME_STATE: GameStateData
  ENTITY_STORAGE: EntityStorageData
  ENTITY_CHANGE: EntityChangeData
  PLAYER_UI: PlayerUIData
  ORCHESTRATOR_OPERATION: OrchestratorOperationData
  GUIDE_SCRATCHPAD_UPDATE: GuideScratchpadUpdateData
  ENTITY_HISTORY: EntityHistoryData
  ENTITY_HISTORY_RESET: undefined
  SYNC_REQUEST: SyncRequestData
  DASHBOARD_COMMAND: DashboardCommandData
}

export type DashboardMessageType = keyof DashboardMessagePayloadMap

type MetaReducer = (meta?: MessageMeta) => { timestamp: number; version?: string }

const buildMeta: MetaReducer = (meta) => ({
  timestamp: meta?.timestamp ?? Date.now(),
  version: meta?.version
})

export type DashboardMessageOf<T extends DashboardMessageType> = {
  type: T
  timestamp: number
  version?: string
} & (DashboardMessagePayloadMap[T] extends undefined ? {} : { data: DashboardMessagePayloadMap[T] })

export type DashboardMessage = DashboardMessageOf<DashboardMessageType>

type MessageBuilderMap = {
  [K in DashboardMessageType]: {
    build: (payload: DashboardMessagePayloadMap[K], meta?: MessageMeta) => DashboardMessageOf<K>
    summarize: (payload: DashboardMessagePayloadMap[K]) => string
  }
}

export const messageCatalog: MessageBuilderMap = {
  GAME_STATE: {
    build: (payload, meta) => ({
      type: 'GAME_STATE',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) => `state=${payload.gameState}`
  },
  ENTITY_STORAGE: {
    build: (payload, meta) => ({
      type: 'ENTITY_STORAGE',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) =>
      `items=${payload.counts.items} locations=${payload.counts.locations} npcs=${payload.counts.npcs} regions=${payload.counts.regions}`
  },
  ENTITY_CHANGE: {
    build: (payload, meta) => ({
      type: 'ENTITY_CHANGE',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) => `${payload.entityType}:${payload.entityId} ${payload.changeSource}`
  },
  PLAYER_UI: {
    build: (payload, meta) => ({
      type: 'PLAYER_UI',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) =>
      `location=${payload.currentLocation?.name ?? payload.currentLocation?.id ?? 'unknown'} region=${
        payload.currentRegion?.name ?? payload.currentRegion?.id ?? 'unknown'
      }`
  },
  ORCHESTRATOR_OPERATION: {
    build: (payload, meta) => ({
      type: 'ORCHESTRATOR_OPERATION',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) => `${payload.operationType} success=${payload.success}`
  },
  GUIDE_SCRATCHPAD_UPDATE: {
    build: (payload, meta) => ({
      type: 'GUIDE_SCRATCHPAD_UPDATE',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) => `changeType=${payload.changeType} reason=${payload.reason ?? 'n/a'}`
  },
  ENTITY_HISTORY: {
    build: (payload, meta) => ({
      type: 'ENTITY_HISTORY',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) => `${payload.entityType}:${payload.entityId} entries=${payload.history.length}`
  },
  ENTITY_HISTORY_RESET: {
    build: (_payload, meta) => ({
      type: 'ENTITY_HISTORY_RESET',
      ...buildMeta(meta)
    }),
    summarize: () => 'history reset'
  },
  SYNC_REQUEST: {
    build: (payload, meta) => ({
      type: 'SYNC_REQUEST',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) => `requester=${payload.requesterId}`
  },
  DASHBOARD_COMMAND: {
    build: (payload, meta) => ({
      type: 'DASHBOARD_COMMAND',
      ...buildMeta(meta),
      data: payload
    }),
    summarize: (payload) => `${payload.commandType}`
  }
}

export function buildMessage<T extends DashboardMessageType>(
  type: T,
  payload: DashboardMessagePayloadMap[T],
  meta?: MessageMeta
): DashboardMessageOf<T> {
  return messageCatalog[type].build(payload, meta)
}

export function summarizeMessage<T extends DashboardMessageType>(
  type: T,
  payload: DashboardMessagePayloadMap[T]
): string {
  return messageCatalog[type].summarize(payload)
}