import { useEffect, useState } from 'react'
import {
  buildMessage,
  DASHBOARD_CHANNEL_NAME,
  type DashboardMessage,
  type GameStateData,
  type EntityStorageData,
  type EntityChangeData,
  type PlayerUIData,
  type OrchestratorOperationData,
  type GuideScratchpadUpdateData,
  type EntityHistoryData
} from './messages'
import { DashboardHeader } from './components/DashboardHeader'
import { OrchestratorPanel } from './panels/OrchestratorPanel'
import { ScratchpadPanel } from './panels/ScratchpadPanel'
import { EntityStoragePanel } from './panels/EntityStoragePanel'
import { PlayerUIPanel } from './panels/PlayerUIPanel'
import { EntityHistoryPanel } from './panels/EntityHistoryPanel'
import { TimelinePanel } from './panels/TimelinePanel'
import { EntityModal } from './components/EntityModal'
import type { TimelineEntry } from '../context/timeline'

interface GuideScratchpadHistoryEntry {
  timestamp: number
  guideScratchpad: string
  changeType: string
  reason?: string
}

interface DashboardState {
  gameState: any
  entityStorage: any
  playerUI: any
  entityHistory: any[]  // Array of entity change entries
  orchestratorOperations: Array<any>
  guideScratchpadHistory: GuideScratchpadHistoryEntry[]
  currentGuideScratchpad: string | null
  theTimeline: TimelineEntry[]
  lastUpdate: number
  connectionStatus: 'connected' | 'disconnected'
  selectedEntity: { entity: any; entityType: string } | null
}

export default function DashboardApp() {
  const [state, setState] = useState<DashboardState>({
    gameState: null,
    entityStorage: null,
    playerUI: null,
    entityHistory: [],
    orchestratorOperations: [],
    guideScratchpadHistory: [],
    currentGuideScratchpad: null,
    theTimeline: [],
    lastUpdate: 0,
    connectionStatus: 'disconnected',
    selectedEntity: null
  })

  // Helper function to send sync request
  const sendSyncRequest = (channel: BroadcastChannel) => {
    if (!import.meta.env.DEV) return
    
    const requesterId = `dashboard_${Date.now()}`
    const syncRequest = buildMessage('SYNC_REQUEST', {
      requesterId,
      timestamp: Date.now()
    })
    
    try {
      channel.postMessage(syncRequest)
      console.log('[Dev Dashboard] Sync request sent')
      setState(prev => ({ ...prev, connectionStatus: 'connected' }))
    } catch (error) {
      console.error('[Dev Dashboard] Failed to send sync request:', error)
    }
  }

  // Manual sync function (can be called from UI)
  const handleManualSync = () => {
    const channel = new BroadcastChannel(DASHBOARD_CHANNEL_NAME)
    sendSyncRequest(channel)
    channel.close()
  }

  // Helper function to send dashboard commands to game
  const sendDashboardCommand = (commandType: 'CHANGE_LOCATION', locationId: string) => {
    if (!import.meta.env.DEV) return

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(DASHBOARD_CHANNEL_NAME)
    } catch (error) {
      console.error('[Dev Dashboard] Failed to create BroadcastChannel for command:', error)
      return
    }

    const command = buildMessage('DASHBOARD_COMMAND', {
      commandType,
      locationId
    })

    try {
      channel.postMessage(command)
      console.log('[Dev Dashboard] Command sent:', commandType, locationId)
      channel.close()
    } catch (error) {
      console.error('[Dev Dashboard] Failed to send command:', error)
      channel?.close()
    }
  }

  // Handle location change from PlayerUIPanel
  const handleLocationChange = (locationId: string) => {
    sendDashboardCommand('CHANGE_LOCATION', locationId)
  }

  useEffect(() => {
    let channel: BroadcastChannel | null = null
    
    try {
      channel = new BroadcastChannel(DASHBOARD_CHANNEL_NAME)
    } catch (error) {
      console.error('[Dev Dashboard] Failed to create BroadcastChannel:', error)
      return
    }

    channel.onmessage = (event: MessageEvent<DashboardMessage>) => {
      const message = event.data
      
      setState(prev => {
        const updates: Partial<DashboardState> = {
          lastUpdate: message.timestamp,
          connectionStatus: 'connected'
        }

        switch (message.type) {
          case 'GAME_STATE': {
            const data = message.data as GameStateData | undefined
            if (!data) break
            console.log('[Dev Dashboard] Received GAME_STATE:', { 
              gameState: data.gameState,
              hasConfig: !!data.config,
              hasGuideScratchpad: !!data.config?.theGuideScratchpad
            })
            updates.gameState = data
            // Extract timeline if present
            if (data.config?.theTimeline) {
              updates.theTimeline = data.config.theTimeline
              console.log('[Dev Dashboard] Timeline found in GAME_STATE, entries:', data.config.theTimeline.length)
            }
            // Extract guide scratchpad if present - always update current and add to history if changed
            if (data.config?.theGuideScratchpad) {
              const newGuideScratchpad = data.config.theGuideScratchpad
              console.log('[Dev Dashboard] Guide scratchpad found in GAME_STATE, length:', newGuideScratchpad.length)
              // Always update current guide scratchpad
              updates.currentGuideScratchpad = newGuideScratchpad
              // Only add to history if it's different (avoid duplicates)
              if (prev.currentGuideScratchpad !== newGuideScratchpad) {
                updates.guideScratchpadHistory = [
                  ...prev.guideScratchpadHistory,
                  {
                    timestamp: message.timestamp,
                    guideScratchpad: newGuideScratchpad,
                    changeType: prev.currentGuideScratchpad === null ? 'initial' : 'update',
                    reason: 'Game state update'
                  }
                ]
                console.log('[Dev Dashboard] Added guide scratchpad to history. Total history entries:', updates.guideScratchpadHistory.length)
              }
            }
            break
          }

        case 'ENTITY_HISTORY_RESET':
          updates.entityHistory = []
          console.log('[Dev Dashboard] Entity history reset via broadcast')
          break

          case 'ENTITY_STORAGE': {
            const data = message.data as EntityStorageData | undefined
            if (!data) break
            updates.entityStorage = data
            break
          }

          case 'ENTITY_CHANGE': {
            const data = message.data as EntityChangeData | undefined
            if (!data) break
            // Add to entity history
            updates.entityHistory = [
              ...prev.entityHistory.slice(-99), // Keep last 100
              {
                entityId: data.entityId,
                entityType: data.entityType,
                timestamp: data.timestamp,
                previousState: data.previousState,
                newState: data.newState,
                changeSource: data.changeSource,
                reason: data.reason
              }
            ]
            break
          }

          case 'PLAYER_UI': {
            const data = message.data as PlayerUIData | undefined
            if (!data) break
            updates.playerUI = data
            break
          }

          case 'ORCHESTRATOR_OPERATION': {
            const data = message.data as OrchestratorOperationData | undefined
            if (!data) break
            console.log('[Dev Dashboard] Received ORCHESTRATOR_OPERATION:', data.operationType)
            updates.orchestratorOperations = [
              ...prev.orchestratorOperations.slice(-19), // Keep last 20
              {
                ...data,
                timestamp: message.timestamp
              }
            ]
            console.log(`[Dev Dashboard] Total operations now: ${updates.orchestratorOperations.length}`)
            break
          }

          case 'GUIDE_SCRATCHPAD_UPDATE': {
            const data = message.data as GuideScratchpadUpdateData | undefined
            if (!data) break
            console.log('[Dev Dashboard] Received GUIDE_SCRATCHPAD_UPDATE:', {
              changeType: data.changeType,
              reason: data.reason,
              guideScratchpadLength: data.newGuideScratchpad?.length || 0
            })
            updates.currentGuideScratchpad = data.newGuideScratchpad
            updates.guideScratchpadHistory = [
              ...prev.guideScratchpadHistory,
              {
                timestamp: message.timestamp,
                guideScratchpad: data.newGuideScratchpad,
                changeType: data.changeType,
                reason: data.reason
              }
            ]
            console.log('[Dev Dashboard] Guide scratchpad history updated. Total entries:', updates.guideScratchpadHistory.length)
            // Also update gameState config if available
            if (prev.gameState?.config) {
              updates.gameState = {
                ...prev.gameState,
                config: {
                  ...prev.gameState.config,
                  theGuideScratchpad: data.newGuideScratchpad
                }
              }
            }
            break
          }

          case 'ENTITY_HISTORY': {
            const data = message.data as EntityHistoryData | undefined
            if (!data) break
            // Merge entity history entries, avoiding duplicates
            console.log('[Dev Dashboard] Received ENTITY_HISTORY:', {
              entityId: data.entityId,
              entityType: data.entityType,
              historyEntries: data.history?.length || 0
            })
            // Create a set of existing entry keys (entityId + timestamp) to avoid duplicates
            const existingKeys = new Set(
              prev.entityHistory.map(e => `${e.entityId}:${e.timestamp}`)
            )
            // Add new entries that don't already exist
            const newEntries = (data.history || []).filter((entry: any) => {
              const key = `${entry.entityId}:${entry.timestamp}`
              return !existingKeys.has(key)
            })
            if (newEntries.length > 0) {
              updates.entityHistory = [
                ...prev.entityHistory,
                ...newEntries.map((entry: any) => ({
                  entityId: entry.entityId,
                  entityType: entry.entityType,
                  timestamp: entry.timestamp,
                  previousState: entry.previousState,
                  newState: entry.newState,
                  changeSource: entry.changeSource,
                  reason: entry.reason
                }))
              ]
              console.log(`[Dev Dashboard] Added ${newEntries.length} entity history entries. Total: ${updates.entityHistory.length}`)
            }
            break
          }
        }

        return { ...prev, ...updates }
      })
    }

    // Connection status timeout
    const statusCheck = setInterval(() => {
      setState(prev => {
        const timeSinceUpdate = Date.now() - prev.lastUpdate
        const newStatus = timeSinceUpdate > 5000 ? 'disconnected' : 'connected'
        return newStatus !== prev.connectionStatus 
          ? { ...prev, connectionStatus: newStatus }
          : prev
      })
    }, 1000)

    // Send initial sync request after a short delay to allow contexts to be ready
    const initialSyncTimeout = setTimeout(() => {
      if (channel) {
        sendSyncRequest(channel)
      }
    }, 500)

    return () => {
      channel?.close()
      clearInterval(statusCheck)
      clearTimeout(initialSyncTimeout)
    }
  }, [])

  const handleEntityClick = (entity: any, entityType: string) => {
    setState(prev => ({
      ...prev,
      selectedEntity: { entity, entityType }
    }))
  }

  const handleCloseModal = () => {
    setState(prev => ({
      ...prev,
      selectedEntity: null
    }))
  }

  // Get entity history for selected entity
  const getEntityHistoryForSelected = () => {
    if (!state.selectedEntity) return []
    return state.entityHistory.filter(
      entry => entry.entityId === state.selectedEntity!.entity.id
    )
  }

  return (
    <div className="dashboard-container">
      <DashboardHeader 
        lastUpdate={state.lastUpdate}
        connectionStatus={state.connectionStatus}
        entityStorage={state.entityStorage}
        gameState={state.gameState}
        onSync={handleManualSync}
      />
      
      <div className="dashboard-grid">
        {/* Entity Storage Panel */}
        <div className="dashboard-section entity-section">
          <EntityStoragePanel 
            data={state.entityStorage} 
            onEntityClick={handleEntityClick}
          />
        </div>

        {/* Player UI Panel */}
        <div className="dashboard-section player-section">
          <PlayerUIPanel 
            data={state.playerUI}
            onEntityClick={handleEntityClick}
            allLocations={state.entityStorage?.allLocations || []}
            onLocationChange={handleLocationChange}
          />
        </div>

        {/* Entity History Panel */}
        <div className="dashboard-section history-section">
          <EntityHistoryPanel 
            history={state.entityHistory}
            onEntityClick={handleEntityClick}
          />
        </div>

        {/* Scratchpad and Timeline Panel - Full width, split 50/50 */}
        <div className="dashboard-section scratchpad-timeline-section">
          <div className="scratchpad-timeline-container">
            <div className="scratchpad-timeline-half">
              <ScratchpadPanel 
                currentGuideScratchpad={state.currentGuideScratchpad}
                history={state.guideScratchpadHistory}
              />
            </div>
            <div className="scratchpad-timeline-half">
              <TimelinePanel 
                timeline={state.theTimeline}
              />
            </div>
          </div>
        </div>

        {/* Orchestrator Panel - moved lower for readability */}
        <div className="dashboard-section orchestrator-section">
          <OrchestratorPanel 
            gameState={state.gameState}
            operations={state.orchestratorOperations}
          />
        </div>
      </div>

      {/* Entity Modal */}
      {state.selectedEntity && (
        <EntityModal
          entity={state.selectedEntity.entity}
          entityType={state.selectedEntity.entityType}
          entityHistory={getEntityHistoryForSelected()}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

