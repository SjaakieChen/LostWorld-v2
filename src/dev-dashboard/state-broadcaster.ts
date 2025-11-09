/**
 * State Broadcaster
 *
 * Broadcasts game state changes to the developer dashboard via an injected transport.
 * Defaults to BroadcastChannel in development mode, but can be swapped for tests or
 * alternative transports.
 */
import {
  buildMessage,
  summarizeMessage,
  type DashboardMessage,
  type DashboardMessagePayloadMap,
  type DashboardMessageType,
  type GameStateData,
  type EntityStorageData,
  type EntityChangeData,
  type PlayerUIData,
  type OrchestratorOperationData,
  type GuideScratchpadUpdateData,
  type EntityHistoryData
} from './messages'
import { BroadcastChannelTransport, type DashboardTransport } from './transport'

type LogLevel = 'debug' | 'warn'

interface LogEntry {
  level: LogLevel
  type: DashboardMessageType
  summary: string
  error?: unknown
}

type Logger = (entry: LogEntry) => void

interface StateBroadcasterOptions {
  transport?: DashboardTransport
  logger?: Logger
}

const defaultLogger: Logger = ({ level, type, summary, error }) => {
  const prefix = `[Dev Dashboard] ${type}`

  if (level === 'warn') {
    console.warn(prefix, summary, error)
  } else if (import.meta.env.DEV) {
    // Only log verbose output in dev to avoid noisy production consoles.
    console.debug(prefix, summary)
  }
}

export class StateBroadcaster {
  private readonly transport: DashboardTransport
  private readonly logger: Logger
  private operationCounter = 0

  constructor(options: StateBroadcasterOptions = {}) {
    this.logger = options.logger ?? defaultLogger
    this.transport =
      options.transport ??
      new BroadcastChannelTransport({
        devOnly: true,
        onError: (error) => {
          this.logger({
            level: 'warn',
            type: 'GAME_STATE',
            summary: 'Transport error',
            error
          })
        }
      })
  }

  private send<K extends DashboardMessageType>(type: K, payload: DashboardMessagePayloadMap[K]) {
    if (!this.transport.isAvailable()) {
      this.logger({
        level: 'debug',
        type,
        summary: 'Transport unavailable; message dropped'
      })
      return
    }

    const message = buildMessage(type, payload)

    try {
      this.transport.publish(message as DashboardMessage)
      this.logger({
        level: 'debug',
        type,
        summary: summarizeMessage(type, payload)
      })
    } catch (error) {
      this.logger({
        level: 'warn',
        type,
        summary: 'Failed to publish message',
        error
      })
    }
  }

  broadcastGameState(data: GameStateData): void {
    this.send('GAME_STATE', data)
  }

  broadcastEntityStorage(data: Omit<EntityStorageData, 'counts'> & Partial<Pick<EntityStorageData, 'counts'>>): void {
    const counts = data.counts ?? {
      items: data.allItems?.length ?? 0,
      locations: data.allLocations?.length ?? 0,
      npcs: data.allNPCs?.length ?? 0,
      regions: data.allRegions?.length ?? 0
    }

    this.send('ENTITY_STORAGE', {
      ...data,
      counts,
      entityMapSize: data.entityMapSize ?? counts.items
    })
  }

  broadcastEntityChange(data: EntityChangeData): void {
    this.send('ENTITY_CHANGE', data)
  }

  broadcastPlayerUI(data: PlayerUIData): void {
    this.send('PLAYER_UI', data)
  }

  broadcastOrchestratorOperation(
    payload: Omit<OrchestratorOperationData, 'operationId'> & Partial<Pick<OrchestratorOperationData, 'operationId'>>
  ): void {
    const operationId = payload.operationId ?? `op_${Date.now()}_${++this.operationCounter}`
    const messagePayload = {
      ...payload,
      operationId
    } as OrchestratorOperationData
    this.send('ORCHESTRATOR_OPERATION', messagePayload)
  }

  broadcastGuideScratchpadUpdate(data: GuideScratchpadUpdateData): void {
    this.send('GUIDE_SCRATCHPAD_UPDATE', data)
  }

  broadcastEntityHistory(data: EntityHistoryData): void {
    this.send('ENTITY_HISTORY', data)
  }

  broadcastEntityHistoryReset(): void {
    this.send('ENTITY_HISTORY_RESET', undefined)
  }

  close(): void {
    this.transport.close()
  }
}

// Singleton instance
export const stateBroadcaster = new StateBroadcaster()

