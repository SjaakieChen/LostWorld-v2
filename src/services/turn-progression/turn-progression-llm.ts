/**
 * Turn Progression LLM Service
 * 
 * World simulation LLM that runs at the end of each turn to:
 * - Generate turn goals for the next turn
 * - Move entities (NPCs, items)
 * - Modify entity attributes
 * - Generate new entities
 * - Update player status and stats
 */

import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { GameConfiguration } from '../game-orchestrator/types'
import type { TimelineEntry, Timeline } from '../../context/timeline'
import type { Item, NPC, Location } from '../../types'
import type { Attribute } from '../../types/base.types'
import type { PlayerStats, PlayerStatus, GameRules } from '../entity-generation/types'
import type { EntitySummary, TurnProgressionDecision, TurnProgressionCallbacks } from './types'
import { generateEntityWithContext } from '../entity-generation'
import { pushTimelineContext, pushTurnContext } from '../timeline/timeline-service'
import { buildTimelineTags } from '../timeline/tags'
import { buildGuideMaterials } from '../../context/hardcoded-game-form'

const TURN_PROGRESSION_MODEL = GEMINI_CONFIG.models.pro
const API_BASE_URL = GEMINI_CONFIG.apiBase

/**
 * Build entity summary from EntityStorage
 */
export function buildEntitySummary(
  allItems: Item[],
  allNPCs: NPC[],
  allLocations: Location[]
): EntitySummary {
  return {
    items: allItems.map(item => ({
      id: item.id,
      name: item.name,
      region: item.region,
      x: item.x,
      y: item.y,
      attributes: Object.entries(item.own_attributes || {}).reduce((acc, [key, attr]) => {
        acc[key] = attr.value
        return acc
      }, {} as Record<string, number>)
    })),
    npcs: allNPCs.map(npc => ({
      id: npc.id,
      name: npc.name,
      region: npc.region,
      x: npc.x,
      y: npc.y,
      attributes: Object.entries(npc.own_attributes || {}).reduce((acc, [key, attr]) => {
        acc[key] = attr.value
        return acc
      }, {} as Record<string, number>)
    })),
    locations: allLocations.map(location => ({
      id: location.id,
      name: location.name,
      region: location.region,
      x: location.x,
      y: location.y,
      attributes: Object.entries(location.own_attributes || {}).reduce((acc, [key, attr]) => {
        acc[key] = attr.value
        return acc
      }, {} as Record<string, number>)
    }))
  }
}

/**
 * Format entity summary as text for LLM prompt
 */
function formatEntitySummary(summary: EntitySummary): string {
  const parts: string[] = []
  
  parts.push('=== ENTITIES IN THE WORLD ===\n')
  
  if (summary.items.length > 0) {
    parts.push('ITEMS:')
    summary.items.forEach(item => {
      const attrs = Object.entries(item.attributes)
        .map(([key, val]) => `${key}=${val}`)
        .join(', ')
      parts.push(`  - ${item.name} (id: ${item.id}) at region: ${item.region}, (xcoordinate:${item.x}, ycoordinate:${item.y})${attrs ? ` [${attrs}]` : ''}`)
    })
    parts.push('')
  }
  
  if (summary.npcs.length > 0) {
    parts.push('NPCS:')
    summary.npcs.forEach(npc => {
      const attrs = Object.entries(npc.attributes)
        .map(([key, val]) => `${key}=${val}`)
        .join(', ')
      parts.push(`  - ${npc.name} (id: ${npc.id}) at region: ${npc.region}, (xcoordinate:${npc.x}, ycoordinate:${npc.y})${attrs ? ` [${attrs}]` : ''}`)
    })
    parts.push('')
  }
  
  if (summary.locations.length > 0) {
    parts.push('LOCATIONS:')
    summary.locations.forEach(location => {
      const attrs = Object.entries(location.attributes)
        .map(([key, val]) => `${key}=${val}`)
        .join(', ')
      parts.push(`  - ${location.name} (id: ${location.id}) at region: ${location.region}, (xcoordinate:${location.x}, ycoordinate:${location.y})${attrs ? ` [${attrs}]` : ''}`)
    })
    parts.push('')
  }
  
  return parts.join('\n')
}

/**
 * Format timeline entries for current and last turn
 */
function formatTimelineEntries(entries: TimelineEntry[]): string {
  if (entries.length === 0) {
    return 'No timeline entries for this turn.'
  }
  
  return entries.map(entry => {
    const tags = entry.tags.join(', ')
    return `[Turn ${entry.turn}] [${tags}]: ${entry.text}`
  }).join('\n')
}

/**
 * Format attributes library from gameRules for LLM prompt
 */
function formatAttributesLibrary(gameRules: GameRules): string {
  const parts: string[] = []
  
  parts.push('=== ATTRIBUTES LIBRARY ===\n')
  parts.push('This library shows all available attributes by entity type and category.')
  parts.push('You can use existing attributes or create new ones when needed.\n')
  
  // Item Categories
  if (gameRules.itemCategories && gameRules.itemCategories.length > 0) {
    parts.push('ITEM CATEGORIES:')
    gameRules.itemCategories.forEach(category => {
      parts.push(`\n  Category: "${category.name}"`)
      if (category.attributes && category.attributes.length > 0) {
        category.attributes.forEach(attr => {
          const typeInfo = attr.range 
            ? `${attr.type} (${attr.range.min}-${attr.range.max})`
            : attr.type
          const reference = attr.reference ? ` → ${attr.reference}` : ''
          parts.push(`    - ${attr.name} (${typeInfo}): ${attr.description}${reference}`)
        })
      } else {
        parts.push('    (no attributes defined)')
      }
    })
    parts.push('')
  }
  
  // NPC Categories
  if (gameRules.npcCategories && gameRules.npcCategories.length > 0) {
    parts.push('NPC CATEGORIES:')
    gameRules.npcCategories.forEach(category => {
      parts.push(`\n  Category: "${category.name}"`)
      if (category.attributes && category.attributes.length > 0) {
        category.attributes.forEach(attr => {
          const typeInfo = attr.range 
            ? `${attr.type} (${attr.range.min}-${attr.range.max})`
            : attr.type
          const reference = attr.reference ? ` → ${attr.reference}` : ''
          parts.push(`    - ${attr.name} (${typeInfo}): ${attr.description}${reference}`)
        })
      } else {
        parts.push('    (no attributes defined)')
      }
    })
    parts.push('')
  }
  
  // Location Categories
  if (gameRules.locationCategories && gameRules.locationCategories.length > 0) {
    parts.push('LOCATION CATEGORIES:')
    gameRules.locationCategories.forEach(category => {
      parts.push(`\n  Category: "${category.name}"`)
      if (category.attributes && category.attributes.length > 0) {
        category.attributes.forEach(attr => {
          const typeInfo = attr.range 
            ? `${attr.type} (${attr.range.min}-${attr.range.max})`
            : attr.type
          const reference = attr.reference ? ` → ${attr.reference}` : ''
          parts.push(`    - ${attr.name} (${typeInfo}): ${attr.description}${reference}`)
        })
      } else {
        parts.push('    (no attributes defined)')
      }
    })
    parts.push('')
  }
  
  parts.push('When adding a new attribute to an entity:')
  parts.push('- Use the entity\'s category to determine which category library it belongs to')
  parts.push('- Provide type, description, and reference for new attributes')
  parts.push('- New attributes will be added to the library for future use\n')
  
  return parts.join('\n')
}

/**
 * Turn Progression Decision JSON Schema
 */
const TURN_PROGRESSION_SCHEMA = {
  type: 'object',
  properties: {
    turnGoal: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Short paragraph describing the mini goal for the next turn' },
        changeReason: { type: 'string', description: 'Why this goal was chosen' }
      },
      required: ['text', 'changeReason']
    },
    turnProgression: {
      type: 'string',
      description: ' Summary of what happened during simulated time progression and what has changed and why'
    },
    entityGeneration: {
      type: 'array',
      maxItems: 10,
      description: 'Array of entities to generate (up to 10 per turn)',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['item', 'npc', 'location'], description: 'Type of entity to generate' },
          prompt: { type: 'string', description: 'Description of the entity to generate' },
          region: { type: 'string', description: 'Region where entity should be placed' },
          x: { type: 'number', description: 'X coordinate where entity should be placed' },
          y: { type: 'number', description: 'Y coordinate where entity should be placed' },
          changeReason: { type: 'string', description: 'Why this entity is being generated' }
        },
        required: ['type', 'prompt', 'region', 'x', 'y', 'changeReason']
      }
    },
    entityMoves: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'ID of the entity to move' },
          entityType: { type: 'string', enum: ['item', 'npc'], description: 'Type of entity' },
          newRegion: { type: 'string', description: 'New region for the entity' },
          newX: { type: 'number', description: 'New X coordinate' },
          newY: { type: 'number', description: 'New Y coordinate' },
          changeReason: { type: 'string', description: 'Why this entity is being moved' }
        },
        required: ['entityId', 'entityType', 'newRegion', 'newX', 'newY', 'changeReason']
      }
    },
    attributeChanges: {
      type: 'array',
      description: 'Array of attribute changes. Can update existing attributes or add new ones.',
      items: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'ID of the entity to modify' },
          entityType: { type: 'string', enum: ['item', 'npc', 'location'], description: 'Type of entity' },
          attributeName: { type: 'string', description: 'Name of the attribute to change or add' },
          newValue: { 
            type: 'number', 
            description: 'New value for the attribute. Required when updating existing attribute. Required when adding new attribute if type is number/integer.' 
          },
          changeReason: { type: 'string', description: 'Why this attribute is being changed' },
          // Optional fields for NEW attributes
          type: { 
            type: 'string', 
            enum: ['integer', 'number', 'string', 'boolean', 'array'],
            description: 'Type of the attribute. REQUIRED when adding a NEW attribute. Omit when updating existing attribute.'
          },
          description: { 
            type: 'string', 
            description: 'Description of what this attribute represents. REQUIRED when adding a NEW attribute. Omit when updating existing attribute.' 
          },
          reference: { 
            type: 'string', 
            description: 'Reference scale or examples for this attribute (e.g., "0=broken, 50=worn, 100=pristine"). REQUIRED when adding a NEW attribute. Omit when updating existing attribute.' 
          }
        },
        required: ['entityId', 'entityType', 'attributeName', 'changeReason']
      }
    },
    statusChanges: {
      type: 'object',
      properties: {
        health: { type: 'number', description: 'Change to health (delta, can be negative)' },
        energy: { type: 'number', description: 'Change to energy (delta, can be negative)' },
        changeReason: { type: 'string', description: 'Why status is changing' }
      },
      required: ['health', 'energy', 'changeReason']
    },
    statChanges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statName: { type: 'string', description: 'Name of the stat to change' },
          delta: { type: 'number', description: 'Change amount (can be negative)' },
          changeReason: { type: 'string', description: 'Why this stat is changing' }
        },
        required: ['statName', 'delta', 'changeReason']
      }
    }
  },
  required: ['turnGoal', 'turnProgression']
}

/**
 * Add new attributes to the gameRules attribute library
 * Similar to addNewAttributesToLibrary in entity-generation files
 */
function addNewAttributesToLibrary(
  entityType: 'item' | 'npc' | 'location',
  newAttributes: Record<string, { type: string; description: string; reference: string; category: string }>,
  gameRules: GameRules
): void {
  let categories: Array<{ name: string; attributes: any[] }>
  
  // Select the appropriate category array based on entity type
  if (entityType === 'item') {
    categories = gameRules.itemCategories
  } else if (entityType === 'npc') {
    categories = gameRules.npcCategories
  } else {
    categories = gameRules.locationCategories
  }
  
  for (const [attrName, attrData] of Object.entries(newAttributes)) {
    const categoryName = attrData.category
    
    // Find the category in the appropriate categories array
    let categoryDef = categories.find(c => c.name === categoryName)
    
    // Create category if it doesn't exist
    if (!categoryDef) {
      categoryDef = {
        name: categoryName,
        attributes: []
      }
      categories.push(categoryDef)
      console.log(`✅ Created new category "${categoryName}" in ${entityType}Categories`)
    }
    
    // Check if attribute already exists
    const existingAttr = categoryDef.attributes.find(a => a.name === attrName)
    
    // Add new attribute if it doesn't exist
    if (!existingAttr) {
      categoryDef.attributes.push({
        name: attrName,
        type: attrData.type,
        description: attrData.description,
        reference: attrData.reference
      })
      console.log(`✅ Added new attribute "${attrName}" to ${categoryName} category in ${entityType}Categories`)
    }
  }
}

/**
 * Validate that all changes in decision have changeReason
 */
function validateDecision(decision: TurnProgressionDecision): void {
  if (!decision.turnGoal?.text?.trim()) {
    throw new Error('Turn goal must include descriptive text')
  }

  if (!decision.turnGoal.changeReason?.trim()) {
    throw new Error('Turn goal must include changeReason')
  }

  if (!decision.turnProgression?.trim()) {
    throw new Error('Turn progression summary must be provided')
  }

  if (decision.entityGeneration) {
    for (const generation of decision.entityGeneration) {
      if (!generation.changeReason) {
        throw new Error(`Entity generation must include changeReason for ${generation.type} at ${generation.region}:${generation.x},${generation.y}`)
      }
    }
  }
  
  if (decision.entityMoves) {
    for (const move of decision.entityMoves) {
      if (!move.changeReason) {
        throw new Error(`Entity move for ${move.entityId} must include changeReason`)
      }
    }
  }
  
  if (decision.attributeChanges) {
    for (const change of decision.attributeChanges) {
      if (!change.changeReason) {
        throw new Error(`Attribute change for ${change.entityId}.${change.attributeName} must include changeReason`)
      }
      
      // If type, description, or reference is provided, this is a NEW attribute
      // Validate that all required fields for new attributes are present
      const isNewAttribute = !!(change.type || change.description || change.reference)
      
      if (isNewAttribute) {
        if (!change.type) {
          throw new Error(`New attribute ${change.attributeName} for ${change.entityId} must include type`)
        }
        if (!change.description) {
          throw new Error(`New attribute ${change.attributeName} for ${change.entityId} must include description`)
        }
        if (!change.reference) {
          throw new Error(`New attribute ${change.attributeName} for ${change.entityId} must include reference`)
        }
        // newValue is optional for string/boolean/array types, but should be provided for number/integer
        if ((change.type === 'number' || change.type === 'integer') && change.newValue === undefined) {
          throw new Error(`New attribute ${change.attributeName} for ${change.entityId} with type ${change.type} must include newValue`)
        }
      } else {
        // Updating existing attribute - newValue should be provided
        if (change.newValue === undefined) {
          throw new Error(`Attribute update for ${change.entityId}.${change.attributeName} must include newValue`)
        }
      }
    }
  }
  
  if (decision.statusChanges && !decision.statusChanges.changeReason) {
    throw new Error('Status changes must include changeReason')
  }
  
  if (decision.statChanges) {
    for (const change of decision.statChanges) {
      if (!change.changeReason) {
        throw new Error(`Stat change for ${change.statName} must include changeReason`)
      }
    }
  }
  
  // turnGoal change reason already checked above
}

/**
 * Execute turn progression decisions
 */
async function executeDecisions(
  decision: TurnProgressionDecision,
  gameConfig: GameConfiguration,
  callbacks: TurnProgressionCallbacks,
  currentTurn: number,
  currentLocation: Location
): Promise<void> {
  // Append turn progression summary to timeline first
  if (decision.turnProgression?.trim()) {
    const tags = buildTimelineTags({
      location: 'none',
      eventType: 'turnProgression',
      llmId: 'turnProgressionLLM',
      actor: 'ai'
    })
    callbacks.updateTimeline(tags, decision.turnProgression.trim())
  }

  // Execute entity generation
  if (decision.entityGeneration && decision.entityGeneration.length > 0) {
    for (const generation of decision.entityGeneration) {
      const { type, prompt, region, x, y, changeReason } = generation
      
      try {
        const generationResult = await generateEntityWithContext({
          type,
          prompt,
          gameRules: gameConfig.gameRules,
          region,
          x,
          y,
          gameConfig,
          changeReason
        })

        if (type === 'item' || type === 'npc' || type === 'location') {
          callbacks.addEntity(generationResult.entity as Item | NPC | Location, type)
        }

        console.log(`Generated ${type}: ${prompt} (${changeReason})`)
      } catch (error) {
        console.error(`Failed to generate ${type}: ${prompt}`, error)
      }
    }
  }
  
  // Execute entity moves
  if (decision.entityMoves) {
    for (const move of decision.entityMoves) {
      const getEntityFn = move.entityType === 'item' 
        ? callbacks.getAllItemById 
        : callbacks.getAllNPCById
      
      const entity = getEntityFn(move.entityId)
      
      if (!entity) {
        console.warn(`Entity ${move.entityId} not found for move`)
        continue
      }
      
      const oldRegion = entity.region
      const oldX = entity.x
      const oldY = entity.y
      
      // Create updated entity with new coordinates
      const movedEntity = {
        ...entity,
        region: move.newRegion,
        x: move.newX,
        y: move.newY
      }
      
      callbacks.updateEntity(movedEntity, move.entityType, move.changeReason, 'system')
      
      // Create timeline entry
      const timelineText = `name: ${entity.name} reason: ${move.changeReason} oldlocation: ${oldRegion}:${oldX}:${oldY} newlocation: ${move.newRegion}:${move.newX}:${move.newY}`
      const tags = buildTimelineTags({
        location: `${move.newRegion}:${move.newX}:${move.newY}`,
        eventType: 'entityChange',
        llmId: 'turnProgressionLLM',
        actor: 'ai'
      })
      callbacks.updateTimeline(tags, timelineText)
    }
  }
  
  // Execute attribute changes
  if (decision.attributeChanges) {
    for (const change of decision.attributeChanges) {
      const getEntityFn = change.entityType === 'item'
        ? callbacks.getAllItemById
        : change.entityType === 'npc'
        ? callbacks.getAllNPCById
        : callbacks.getAllLocationById
      
      const entity = getEntityFn(change.entityId)
      
      if (!entity) {
        console.warn(`Entity ${change.entityId} not found for attribute change`)
        continue
      }
      const entityLocationId =
        entity.region != null
          ? `${entity.region}:${entity.x}:${entity.y}`
          : 'unknown'
      
      // Check if this is adding a new attribute or updating an existing one
      const isNewAttribute = !!(change.type || change.description || change.reference)
      const attributeExists = entity.own_attributes && entity.own_attributes[change.attributeName]
      
      if (isNewAttribute) {
        // Adding a new attribute
        if (!change.type || !change.description || !change.reference) {
          console.warn(`New attribute ${change.attributeName} for ${change.entityId} missing required metadata (type, description, reference)`)
          continue
        }
        
        // Get the entity's category to determine which library category to add to
        const entityCategory = entity.category || 'common'
        
        // Create new attribute with full metadata
        const newAttributeValue = change.newValue !== undefined 
          ? change.newValue 
          : change.type === 'boolean' 
            ? false 
            : change.type === 'string' 
              ? '' 
              : change.type === 'array' 
                ? [] 
                : 0
        
        const newAttribute: Attribute = {
          value: newAttributeValue,
          type: change.type,
          description: change.description,
          reference: change.reference
        }
        
        // Create updated entity with new attribute added
        const updatedEntity = {
          ...entity,
          own_attributes: {
            ...(entity.own_attributes || {}),
            [change.attributeName]: newAttribute
          }
        }
        
        callbacks.updateEntity(updatedEntity, change.entityType, change.changeReason, 'system')
        
        // Add to attributes library
        addNewAttributesToLibrary(
          change.entityType,
          {
            [change.attributeName]: {
              type: change.type,
              description: change.description,
              reference: change.reference,
              category: entityCategory
            }
          },
          gameConfig.gameRules
        )
        
        // Create timeline entry for new attribute
        const timelineText = `name: ${entity.name} reason: ${change.changeReason} newattribute: ${change.attributeName}=${newAttributeValue} (type: ${change.type})`
        const tags = buildTimelineTags({
          location: entityLocationId,
          eventType: 'entityChange',
          llmId: 'turnProgressionLLM',
          actor: 'ai'
        })
        callbacks.updateTimeline(tags, timelineText)
        
        console.log(`Added new attribute ${change.attributeName} to ${change.entityType} ${entity.id}`)
      } else {
        // Updating an existing attribute
        if (!attributeExists) {
          console.warn(`Attribute ${change.attributeName} not found on entity ${change.entityId} - use type, description, and reference to add new attributes`)
          continue
        }
        
        if (change.newValue === undefined) {
          console.warn(`Attribute update for ${change.entityId}.${change.attributeName} missing newValue`)
          continue
        }
        
        if (!entity.own_attributes || !entity.own_attributes[change.attributeName]) {
          console.warn(`Attribute ${change.attributeName} not found on entity ${change.entityId}`)
          continue
        }
        
        const oldValue = entity.own_attributes[change.attributeName].value
        
        // Create updated entity with modified attribute
        const updatedEntity = {
          ...entity,
          own_attributes: {
            ...entity.own_attributes,
            [change.attributeName]: {
              ...entity.own_attributes[change.attributeName],
              value: change.newValue
            }
          }
        }
        
        callbacks.updateEntity(updatedEntity, change.entityType, change.changeReason, 'system')
        
        // Create timeline entry
        const timelineText = `name: ${entity.name} reason: ${change.changeReason} old attribute: ${change.attributeName}=${oldValue} newattribute: ${change.attributeName}=${change.newValue}`
        const tags = buildTimelineTags({
          location: entityLocationId,
          eventType: 'entityChange',
          llmId: 'turnProgressionLLM',
          actor: 'ai'
        })
        callbacks.updateTimeline(tags, timelineText)
      }
    }
  }
  
  // Execute status changes
  if (decision.statusChanges) {
    const { health, energy, changeReason } = decision.statusChanges
    callbacks.updatePlayerStatus(health, energy, changeReason)

    const formatDelta = (value: number) => (value >= 0 ? `+${value}` : `${value}`)
    const statusTimelineText =
      `reason: ${changeReason} ` +
      `health_delta: ${formatDelta(health)} ` +
      `energy_delta: ${formatDelta(energy)}`

    const locationId = `${currentLocation.region}:${currentLocation.x}:${currentLocation.y}`
    const tags = buildTimelineTags({
      location: locationId,
      eventType: 'statusChange',
      llmId: 'turnProgressionLLM',
      actor: 'ai'
    })
    callbacks.updateTimeline(tags, statusTimelineText)
  }
  
  // Execute stat changes
  if (decision.statChanges) {
    for (const change of decision.statChanges) {
      callbacks.updatePlayerStat(change.statName, change.delta, change.changeReason)

      const statTimelineText =
        `reason: ${change.changeReason} ` +
        `stat: ${change.statName} delta: ${change.delta >= 0 ? `+${change.delta}` : change.delta}`

      const locationId = `${currentLocation.region}:${currentLocation.x}:${currentLocation.y}`
      const tags = buildTimelineTags({
        location: locationId,
        eventType: 'statusChange',
        llmId: 'turnProgressionLLM',
        actor: 'ai'
      })
      callbacks.updateTimeline(tags, statTimelineText)
    }
  }
  
  // Append turn goal for next turn
  const { text } = decision.turnGoal
  const tags = buildTimelineTags({
    location: 'none',
    eventType: 'turnGoal',
    llmId: 'turnProgressionLLM',
    actor: 'ai'
  })
  callbacks.updateTimeline(tags, text, currentTurn + 1)
}

/**
 * Main function: Process turn progression
 */
export async function processTurnProgression(
  gameConfig: GameConfiguration,
  timeline: Timeline,
  currentTurn: number,
  entitySummary: EntitySummary,
  currentLocation: Location,
  playerStats: PlayerStats,
  playerStatus: PlayerStatus,
  callbacks: TurnProgressionCallbacks
): Promise<void> {
  const API_KEY = getApiKey()
  const endpoint = `${API_BASE_URL}/${TURN_PROGRESSION_MODEL}:generateContent?key=${API_KEY}`
  
  if (!Array.isArray(gameConfig.theTimeline)) {
    gameConfig.theTimeline = []
  }

  const releaseTimelineContext = pushTimelineContext({
    getTimeline: () => gameConfig.theTimeline,
    setTimeline: updatedTimeline => {
      gameConfig.theTimeline = updatedTimeline
    },
    source: 'turn-progression-llm'
  })

  const releaseTurnContext = pushTurnContext({
    getCurrentTurn: () => currentTurn,
    source: 'turn-progression-llm'
  })

  const guardTimelineUpdate = (tags: string[], text: string, turnOverride?: number) => {
    const beforeLength = Array.isArray(gameConfig.theTimeline) ? gameConfig.theTimeline.length : 0
    callbacks.updateTimeline(tags, text, turnOverride)
    const afterLength = Array.isArray(gameConfig.theTimeline) ? gameConfig.theTimeline.length : 0
    if (afterLength === beforeLength) {
      console.warn('[TurnProgression] Timeline entry was not recorded.', { tags, text, turnOverride })
    }
  }

  const guardedCallbacks: TurnProgressionCallbacks = {
    ...callbacks,
    updateTimeline: guardTimelineUpdate
  }

  // Get guide scratchpad
  const guideMaterials = buildGuideMaterials(gameConfig.theGuideScratchpad)
  
  // Filter timeline for current and last turn (include all tags for richer context)
  const filterEntries = (turn: number) =>
    timeline.filter(entry => entry.turn === turn)

  const currentTurnEntries = filterEntries(currentTurn)
  const lastTurnEntries = filterEntries(currentTurn - 1)
  
  // Format context
  const entitySummaryText = formatEntitySummary(entitySummary)
  const timelineText = `CURRENT TURN (${currentTurn}):\n${formatTimelineEntries(currentTurnEntries)}\n\nLAST TURN (${currentTurn - 1}):\n${formatTimelineEntries(lastTurnEntries)}`
  const playerStateText = `
PLAYER CURRENT STATE:
- Location: location name: ${currentLocation.name} at region: ${currentLocation.region}, (xcoordinate:${currentLocation.x}, ycoordinate:${currentLocation.y})
- Health: ${playerStatus.health}/${playerStatus.maxHealth}
- Energy: ${playerStatus.energy}/${playerStatus.maxEnergy}
- Stats: ${Object.entries(playerStats).map(([name, stat]) => `${name}=${stat.value} (Tier ${stat.tier})`).join(', ')}
`
  const attributesLibraryText = formatAttributesLibrary(gameConfig.gameRules)
  
  // Build system instruction
  const systemInstruction = `You are the Turn Progression LLM, responsible for simulating world changes at the end of each turn.

HARD CODED GAME FORM + GUIDE SCRATCHPAD:
${guideMaterials}

${attributesLibraryText}

${entitySummaryText}

${timelineText}

${playerStateText}

Your responsibilities:
1. Generate a turn goal (short paragraph) for the NEXT turn that gives the player a mini objective
2. Decide if any entities (NPCs, items) should move and where
3. Decide if any entity attributes should change (e.g., item durability, NPC mood, location condition)
   - You can UPDATE existing attributes (change their value)
   - You can ADD new attributes to entities (provide type, description, reference)
4. Decide if new entities should be generated
5. Decide if player status (health/energy) or stats should change based on world events
6. Provide a summary ("turnProgression") describing what happened during the simulated time progression and what changed and why

IMPORTANT RULES:
- All changes MUST include a changeReason explaining why the change is happening
- If a [action] is performed in the last turn you are responsible for updating the stats and entities according to what you think should happen.
- Generate a turn goal that would guide or enhance the player's experience
- You can move entities if it makes sense for the time progression. As all entities other than the player shoulld
change if realistic for the time progression. If there is no logical reason to move an entity, do not move it.
- Modify attributes if there's a logical reason (combat, wear, weather, etc.)
- When adding NEW attributes: provide type, description, and reference fields
- When updating EXISTING attributes: only provide newValue (type/description/reference come from entity)
- Use the attributes library above to see what attributes are available
- You can create new attributes not in the library - they will be added automatically
- Generate new entities if the world would benefit from them.
- Generate new entities if it is important for the next turn goal or for narrative intrigue.
- Which stat changes should be make can be found by referencing the guide scratchpad for scaling system and how stats should be managed.

- DO NOT simulate player interactions or player decisions. For example the general met with the player and disscussed the strategy is not allowed since the player did not experience this.
you simulate how the world changes.

Output your decisions as JSON matching the provided schema (including both "turnGoal" and "turnProgression").`

  // Build request with structured output
  const requestBody = {
    contents: [{
      role: 'user',
      parts: [{
        text: `Analyze the game state and make decisions for turn progression. Provide your decisions as JSON.`
      }]
    }],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: TURN_PROGRESSION_SCHEMA
    }
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`)
    }
    
    const data = await response.json()
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // Parse JSON response
    let decision: TurnProgressionDecision
    try {
      decision = JSON.parse(jsonText)
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse JSON response')
      }
    }
    
    // Validate decision
    validateDecision(decision)
    
    // Execute decisions
    await executeDecisions(decision, gameConfig, guardedCallbacks, currentTurn, currentLocation)
    
  } catch (error: any) {
    console.error('Turn progression processing failed:', error)
    const errorTags = buildTimelineTags({
      location: 'none',
      eventType: 'turnProgression',
      llmId: 'turnProgressionLLM',
      actor: 'ai'
    })
    guardTimelineUpdate(errorTags, `Turn progression failed: ${error.message}`)
    throw new Error(`Turn progression failed: ${error.message}`)
  } finally {
    releaseTurnContext?.()
    releaseTimelineContext?.()
  }
}

/**
 * TurnProgressionLLM - Main export
 */
export const turnProgressionLLM = {
  processTurnProgression,
  buildEntitySummary
}

