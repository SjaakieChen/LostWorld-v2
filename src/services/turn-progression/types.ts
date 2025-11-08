/**
 * Turn Progression LLM Types
 * 
 * Type definitions for TurnProgression LLM decisions and entity summaries
 */

import type { Item, NPC, Location } from '../../types'

/**
 * Entity Summary - Simplified representation of entities for LLM context
 */
export interface EntitySummary {
  items: Array<{
    id: string
    name: string
    region: string
    x: number
    y: number
    attributes: Record<string, number>  // Simplified: just attribute values
  }>
  npcs: Array<{
    id: string
    name: string
    region: string
    x: number
    y: number
    attributes: Record<string, number>
  }>
  locations: Array<{
    id: string
    name: string
    region: string
    x: number
    y: number
    attributes: Record<string, number>
  }>
}

/**
 * Turn Progression Decision - Structured output from LLM
 * All changes must include a changeReason
 */
export interface TurnProgressionDecision {
  turnGoal: {
    text: string  // Short paragraph for next turn's mini goal
    changeReason: string  // Why this goal was chosen
  }
  turnProgression: string  // Narrative summary of what happened during this turn
  entityGeneration?: Array<{
    type: 'item' | 'npc' | 'location'
    prompt: string
    region: string
    x: number
    y: number
    changeReason: string  // Why this entity is being generated
  }>
  entityMoves?: Array<{
    entityId: string
    entityType: 'item' | 'npc'
    newRegion: string
    newX: number
    newY: number
    changeReason: string  // Why this entity is being moved
  }>
  attributeChanges?: Array<{
    entityId: string
    entityType: 'item' | 'npc' | 'location'
    attributeName: string
    newValue?: number  // Optional - required when updating existing, or when adding new with number/integer type
    changeReason: string  // Why this attribute is being changed
    // Optional fields for NEW attributes (required when adding, omit when updating)
    type?: 'integer' | 'number' | 'string' | 'boolean' | 'array'  // Required when adding new attribute
    description?: string  // Required when adding new attribute
    reference?: string  // Required when adding new attribute
  }>
  statusChanges?: {
    health: number  // delta (can be negative)
    energy: number  // delta (can be negative)
    changeReason: string  // Why status is changing
  }
  statChanges?: Array<{
    statName: string
    delta: number  // change amount (can be negative)
    changeReason: string  // Why this stat is changing
  }>
}

/**
 * Callbacks for TurnProgressionLLM to execute decisions
 */
export interface TurnProgressionCallbacks {
  updateEntity: (entity: Item | NPC | Location, type: 'item' | 'npc' | 'location', changeReason?: string, changeSource?: 'player_action' | 'orchestrator' | 'system' | 'manual') => void
  addEntity: (entity: Item | NPC | Location, type: 'item' | 'npc' | 'location') => void
  getAllItemById: (id: string) => Item | undefined
  getAllNPCById: (id: string) => NPC | undefined
  getAllLocationById: (id: string) => Location | undefined
  updatePlayerStatus: (healthDelta: number, energyDelta: number, changeReason: string) => void
  updatePlayerStat: (statName: string, delta: number, changeReason: string) => void
  updateTimeline: (tags: string[], text: string) => void
}

