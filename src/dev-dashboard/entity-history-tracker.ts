/**
 * Entity History Tracker
 * 
 * Tracks full entity snapshots for version history.
 * Used by game contexts to record all entity changes.
 * Dashboard receives history via broadcasts.
 */

export type EntityType = 'item' | 'npc' | 'location' | 'region'

export type ChangeSource = 'player_action' | 'orchestrator' | 'system' | 'manual'

export interface EntityHistoryEntry {
  entityId: string
  entityType: EntityType
  timestamp: number
  previousState: any | null  // Full entity snapshot before change (null for new entities)
  newState: any              // Full entity snapshot after change
  changeSource: ChangeSource
  reason?: string            // Optional reason for the change
}

class EntityHistoryTracker {
  private history: Map<string, EntityHistoryEntry[]> = new Map()
  private maxVersionsPerEntity = 100

  /**
   * Record a change to an entity
   */
  recordChange(
    entityId: string,
    entityType: EntityType,
    previousState: any | null,
    newState: any,
    changeSource: ChangeSource,
    reason?: string
  ): void {
    const entry: EntityHistoryEntry = {
      entityId,
      entityType,
      timestamp: Date.now(),
      previousState: previousState ? this.deepClone(previousState) : null,
      newState: this.deepClone(newState),
      changeSource,
      reason
    }

    if (!this.history.has(entityId)) {
      this.history.set(entityId, [])
    }

    const entityHistory = this.history.get(entityId)!
    entityHistory.push(entry)

    // Keep only last N versions per entity
    if (entityHistory.length > this.maxVersionsPerEntity) {
      entityHistory.shift() // Remove oldest
    }
  }

  /**
   * Get all history for a specific entity
   */
  getEntityHistory(entityId: string): EntityHistoryEntry[] {
    return this.history.get(entityId) || []
  }

  /**
   * Get all history entries
   */
  getAllHistory(): EntityHistoryEntry[] {
    const allEntries: EntityHistoryEntry[] = []
    for (const entries of this.history.values()) {
      allEntries.push(...entries)
    }
    // Sort by timestamp, newest first
    return allEntries.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get history filtered by entity type
   */
  getHistoryByType(entityType: EntityType): EntityHistoryEntry[] {
    return this.getAllHistory().filter(entry => entry.entityType === entityType)
  }

  /**
   * Get history filtered by change source
   */
  getHistoryBySource(changeSource: ChangeSource): EntityHistoryEntry[] {
    return this.getAllHistory().filter(entry => entry.changeSource === changeSource)
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history.clear()
  }

  /**
   * Clear history for a specific entity
   */
  clearEntityHistory(entityId: string): void {
    this.history.delete(entityId)
  }

  /**
   * Get statistics about history
   */
  getStats(): {
    totalEntries: number
    uniqueEntities: number
    entriesByType: Record<EntityType, number>
    entriesBySource: Record<ChangeSource, number>
  } {
    const allEntries = this.getAllHistory()
    const entriesByType: Record<EntityType, number> = {
      item: 0,
      npc: 0,
      location: 0,
      region: 0
    }
    const entriesBySource: Record<ChangeSource, number> = {
      player_action: 0,
      orchestrator: 0,
      system: 0,
      manual: 0
    }

    for (const entry of allEntries) {
      entriesByType[entry.entityType]++
      entriesBySource[entry.changeSource]++
    }

    return {
      totalEntries: allEntries.length,
      uniqueEntities: this.history.size,
      entriesByType,
      entriesBySource
    }
  }

  /**
   * Deep clone an object to avoid reference issues
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as T
    }

    const cloned = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key])
      }
    }

    return cloned
  }
}

// Singleton instance
export const entityHistoryTracker = new EntityHistoryTracker()

