import { useEffect, useState } from 'react'
import type { DashboardMessage } from './state-broadcaster'
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
    const syncRequest = {
      type: 'SYNC_REQUEST' as const,
      timestamp: Date.now(),
      data: {
        requesterId,
        timestamp: Date.now()
      }
    }
    
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
    const channel = new BroadcastChannel('lostworld-dev-dashboard')
    sendSyncRequest(channel)
    channel.close()
  }

  // Helper function to send dashboard commands to game
  const sendDashboardCommand = (commandType: 'CHANGE_LOCATION', locationId: string) => {
    if (!import.meta.env.DEV) return

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('lostworld-dev-dashboard')
    } catch (error) {
      console.error('[Dev Dashboard] Failed to create BroadcastChannel for command:', error)
      return
    }

    const command = {
      type: 'DASHBOARD_COMMAND' as const,
      timestamp: Date.now(),
      data: {
        commandType,
        locationId
      }
    }

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
      channel = new BroadcastChannel('lostworld-dev-dashboard')
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
          case 'GAME_STATE':
            console.log('[Dev Dashboard] Received GAME_STATE:', { 
              gameState: message.data.gameState,
              hasConfig: !!message.data.config,
              hasGuideScratchpad: !!message.data.config?.theGuideScratchpad
            })
            updates.gameState = message.data
            // Extract timeline if present
            if (message.data.config?.theTimeline) {
              updates.theTimeline = message.data.config.theTimeline
              console.log('[Dev Dashboard] Timeline found in GAME_STATE, entries:', message.data.config.theTimeline.length)
            }
            // Extract guide scratchpad if present - always update current and add to history if changed
            if (message.data.config?.theGuideScratchpad) {
              const newGuideScratchpad = message.data.config.theGuideScratchpad
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

          case 'ENTITY_STORAGE':
            updates.entityStorage = message.data
            break

          case 'ENTITY_CHANGE':
            // Add to entity history
            updates.entityHistory = [
              ...prev.entityHistory.slice(-99), // Keep last 100
              {
                entityId: message.data.entityId,
                entityType: message.data.entityType,
                timestamp: message.data.timestamp,
                previousState: message.data.previousState,
                newState: message.data.newState,
                changeSource: message.data.changeSource,
                reason: message.data.reason
              }
            ]
            break

          case 'PLAYER_UI':
            updates.playerUI = message.data
            break

          case 'ORCHESTRATOR_OPERATION':
            console.log('[Dev Dashboard] Received ORCHESTRATOR_OPERATION:', message.data.operationType)
            updates.orchestratorOperations = [
              ...prev.orchestratorOperations.slice(-19), // Keep last 20
              {
                ...message.data,
                timestamp: message.timestamp
              }
            ]
            console.log(`[Dev Dashboard] Total operations now: ${updates.orchestratorOperations.length}`)
            break

          case 'GUIDE_SCRATCHPAD_UPDATE':
            console.log('[Dev Dashboard] Received GUIDE_SCRATCHPAD_UPDATE:', {
              changeType: message.data.changeType,
              reason: message.data.reason,
              guideScratchpadLength: message.data.newGuideScratchpad?.length || 0
            })
            updates.currentGuideScratchpad = message.data.newGuideScratchpad
            updates.guideScratchpadHistory = [
              ...prev.guideScratchpadHistory,
              {
                timestamp: message.timestamp,
                guideScratchpad: message.data.newGuideScratchpad,
                changeType: message.data.changeType,
                reason: message.data.reason
              }
            ]
            console.log('[Dev Dashboard] Guide scratchpad history updated. Total entries:', updates.guideScratchpadHistory.length)
            // Also update gameState config if available
            if (prev.gameState?.config) {
              updates.gameState = {
                ...prev.gameState,
                config: {
                  ...prev.gameState.config,
                  theGuideScratchpad: message.data.newGuideScratchpad
                }
              }
            }
            break
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
        {/* Orchestrator Panel - Full width */}
        <div className="dashboard-section orchestrator-section">
          <OrchestratorPanel 
            gameState={state.gameState}
            operations={state.orchestratorOperations}
          />
          <ScratchpadPanel 
            currentGuideScratchpad={state.currentGuideScratchpad}
            history={state.guideScratchpadHistory}
          />
        </div>

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

        {/* Timeline Panel */}
        <div className="dashboard-section timeline-section">
          <TimelinePanel 
            timeline={state.theTimeline}
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

