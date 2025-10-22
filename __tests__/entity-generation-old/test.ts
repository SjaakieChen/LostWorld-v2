// Entity Generation Testing UI
// TypeScript test interface for entity generation services

import { createItem } from './item-generation'
import { createNpc } from './npc-generation'
import { createLocation } from './location-generation'
import type { GameRules, GameContext, GenerationResult } from './types'
import type { Item } from '../../types'
import type { NPC } from '../../types/npc.types'
import type { Location } from '../../types/location.types'

// Global API key storage
let API_KEY = ''

// Save API key to localStorage
function saveApiKey(): void {
  const keyInput = document.getElementById('apiKey') as HTMLInputElement
  API_KEY = keyInput.value.trim()
  if (API_KEY) {
    localStorage.setItem('GEMINI_API_KEY', API_KEY)
    // Set environment variable for the service
    import.meta.env.VITE_GEMINI_API_KEY = API_KEY
    alert('API Key saved successfully!')
    keyInput.type = 'password'
  } else {
    alert('Please enter a valid API key')
  }
}

// Load API key on page load
window.addEventListener('DOMContentLoaded', () => {
  const storedKey = localStorage.getItem('GEMINI_API_KEY')
  if (storedKey) {
    API_KEY = storedKey
    import.meta.env.VITE_GEMINI_API_KEY = storedKey
    const keyInput = document.getElementById('apiKey') as HTMLInputElement
    keyInput.value = storedKey
    keyInput.type = 'password'
    console.log('✅ API Key loaded from localStorage')
  }
})

/**
 * Helper: Get input value by ID
 */
function getInputValue(id: string): string {
  const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
  return element?.value || ''
}

/**
 * Helper: Get number value by ID
 */
function getNumberValue(id: string): number {
  const element = document.getElementById(id) as HTMLInputElement
  return parseFloat(element?.value) || 0
}

/**
 * Helper: Get boolean value from select
 */
function getBooleanValue(id: string): boolean {
  const element = document.getElementById(id) as HTMLSelectElement
  return element?.value === 'true'
}

/**
 * Build GameContext from form fields - ALL 12 SECTIONS
 * Note: GameContext is SHARED for all entity types (no entityType prefix on IDs)
 */
function buildGameContextFromForm(): GameContext {
  const context: GameContext = {}

  // 1. Spatial Context
  const locationId = getInputValue('spatial_location_id')
  if (locationId) {
    context.spatial = {
      currentLocation: {
        id: locationId,
        name: getInputValue('spatial_location_name'),
        description: getInputValue('spatial_location_description'),
        category: getInputValue('spatial_location_category'),
        x: getNumberValue('spatial_location_x'),
        y: getNumberValue('spatial_location_y'),
        region: getInputValue('spatial_location_region'),
        rarity: getInputValue('spatial_location_rarity') as any,
      },
      currentRegion: {
        id: getInputValue('spatial_region_id'),
        name: getInputValue('spatial_region_name'),
        theme: getInputValue('spatial_region_theme'),
        biome: getInputValue('spatial_region_biome'),
        description: getInputValue('spatial_region_description'),
        regionX: getNumberValue('spatial_region_x'),
        regionY: getNumberValue('spatial_region_y'),
      },
    }
  }

  // 2. Entities Context
  const nearbyNPCsText = getInputValue('entities_nearbyNPCs')
  if (nearbyNPCsText && nearbyNPCsText !== '[]') {
    try {
      const activeNPCId = getInputValue('entities_activeNPC_id')
      context.entities = {
        nearbyNPCs: JSON.parse(nearbyNPCsText),
        nearbyItems: JSON.parse(getInputValue('entities_nearbyItems') || '[]'),
      }
      if (activeNPCId) {
        context.entities.activeNPC = {
          id: activeNPCId,
          name: getInputValue('entities_activeNPC_name'),
          category: getInputValue('entities_activeNPC_category'),
          conversationTurns: getNumberValue('entities_activeNPC_turns'),
        }
      }
    } catch (e) {
      console.warn('Invalid entities JSON:', e)
    }
  }

  // 3. Player Context
  const playerStrength = document.getElementById('player_strength')
  if (playerStrength) {
    context.player = {
      stats: {
        strength: getNumberValue('player_strength'),
        dexterity: getNumberValue('player_dexterity'),
        intelligence: getNumberValue('player_intelligence'),
        wisdom: getNumberValue('player_wisdom'),
        stealth: getNumberValue('player_stealth'),
        charisma: getNumberValue('player_charisma'),
      },
      status: {
        health: getNumberValue('player_health'),
        maxHealth: getNumberValue('player_maxHealth'),
        stamina: getNumberValue('player_stamina'),
        maxStamina: getNumberValue('player_maxStamina'),
        hunger: getNumberValue('player_hunger'),
        maxHunger: getNumberValue('player_maxHunger'),
        mana: getNumberValue('player_mana'),
        maxMana: getNumberValue('player_maxMana'),
      },
    }
  }

  // 4. Inventory Context
  const totalItemsEl = document.getElementById('inventory_totalItems')
  if (totalItemsEl) {
    const categoriesText = getInputValue('inventory_categories')
    context.inventory = {
      totalItems: getNumberValue('inventory_totalItems'),
      emptySlots: getNumberValue('inventory_emptySlots'),
      rarityDistribution: {
        common: getNumberValue('inventory_common'),
        rare: getNumberValue('inventory_rare'),
        epic: getNumberValue('inventory_epic'),
        legendary: getNumberValue('inventory_legendary'),
      },
      categories: categoriesText ? categoriesText.split(',').map(s => s.trim()).filter(s => s) : [],
    }
    const notableItems = getInputValue('inventory_notableItems')
    if (notableItems) {
      context.inventory.notableItems = notableItems.split(',').map(s => s.trim()).filter(s => s)
    }
  }

  // 5. Equipment Context
  const equippedSlotsEl = document.getElementById('equipment_equippedSlots')
  if (equippedSlotsEl) {
    const equippedSlotsText = getInputValue('equipment_equippedSlots')
    context.equipment = {
      equippedSlots: equippedSlotsText ? equippedSlotsText.split(',').map(s => s.trim()).filter(s => s) : [],
    }
    const totalDefense = getNumberValue('equipment_totalDefense')
    const totalAttack = getNumberValue('equipment_totalAttack')
    if (totalDefense) context.equipment.totalDefense = totalDefense
    if (totalAttack) context.equipment.totalAttack = totalAttack
    const notableEquipment = getInputValue('equipment_notableEquipment')
    if (notableEquipment) {
      context.equipment.notableEquipment = notableEquipment.split(',').map(s => s.trim()).filter(s => s)
    }
  }

  // 6. World Context
  const timeOfDay = getInputValue('world_timeOfDay')
  if (timeOfDay) {
    context.world = {
      timeOfDay: timeOfDay as any,
      season: getInputValue('world_season') as any,
      weather: getInputValue('world_weather') as any,
    }
  }

  // 7. Narrative Context
  const activeQuestsEl = document.getElementById('narrative_activeQuests')
  if (activeQuestsEl) {
    const activeQuestsText = getInputValue('narrative_activeQuests')
    context.narrative = {}
    if (activeQuestsText && activeQuestsText !== '[]') {
      try {
        context.narrative.activeQuests = JSON.parse(activeQuestsText)
      } catch (e) {
        console.warn('Invalid activeQuests JSON:', e)
      }
    }
    const completedQuests = getInputValue('narrative_completedQuests')
    if (completedQuests) {
      context.narrative.completedQuests = completedQuests.split(',').map(s => s.trim()).filter(s => s)
    }
    const recentEvents = getInputValue('narrative_recentEvents')
    if (recentEvents) {
      context.narrative.recentEvents = recentEvents.split(',').map(s => s.trim()).filter(s => s)
    }
    const playerActions = getInputValue('narrative_playerActions')
    if (playerActions) {
      context.narrative.playerActions = playerActions.split(',').map(s => s.trim()).filter(s => s)
    }
    // Only add narrative if it has content
    if (Object.keys(context.narrative).length === 0) {
      delete context.narrative
    }
  }

  // 8. Exploration Context
  const totalLocationsEl = document.getElementById('exploration_totalLocationsExplored')
  if (totalLocationsEl) {
    const regionsVisitedText = getInputValue('exploration_regionsVisited')
    context.exploration = {
      totalLocationsExplored: getNumberValue('exploration_totalLocationsExplored'),
      regionsVisited: regionsVisitedText ? regionsVisitedText.split(',').map(s => s.trim()).filter(s => s) : [],
      unexploredNearby: getNumberValue('exploration_unexploredNearby'),
      isFirstVisit: getBooleanValue('exploration_isFirstVisit'),
    }
  }

  // 9. Relationships Context
  const npcRelationshipsEl = document.getElementById('relationships_npcRelationships')
  if (npcRelationshipsEl) {
    const npcRelationshipsText = getInputValue('relationships_npcRelationships')
    context.relationships = {
      npcRelationships: {},
    }
    if (npcRelationshipsText && npcRelationshipsText !== '{}') {
      try {
        context.relationships.npcRelationships = JSON.parse(npcRelationshipsText)
      } catch (e) {
        console.warn('Invalid npcRelationships JSON:', e)
      }
    }
    const reputationFaction = getInputValue('relationships_reputationFaction')
    if (reputationFaction) {
      context.relationships.reputation = {
        faction: reputationFaction,
        level: getNumberValue('relationships_reputationLevel'),
      }
    }
    // Only add relationships if it has meaningful content
    if (Object.keys(context.relationships.npcRelationships).length === 0 && !context.relationships.reputation) {
      delete context.relationships
    }
  }

  // 10. Combat Context
  const dangerLevelEl = document.getElementById('combat_dangerLevel')
  if (dangerLevelEl) {
    context.combat = {
      dangerLevel: getInputValue('combat_dangerLevel') as any,
      recentCombat: getBooleanValue('combat_recentCombat'),
      enemiesNearby: getNumberValue('combat_enemiesNearby'),
    }
    const combatStyle = getInputValue('combat_playerCombatStyle')
    if (combatStyle) {
      context.combat.playerCombatStyle = combatStyle as any
    }
  }

  // 11. Economy Context
  const playerWealthEl = document.getElementById('economy_playerWealth')
  if (playerWealthEl) {
    context.economy = {
      playerWealth: getNumberValue('economy_playerWealth'),
      localProsperity: getInputValue('economy_localProsperity') as any,
    }
    const commonGoods = getInputValue('economy_commonGoods')
    if (commonGoods) {
      context.economy.commonGoods = commonGoods.split(',').map(s => s.trim()).filter(s => s)
    }
    const rareGoods = getInputValue('economy_rareGoods')
    if (rareGoods) {
      context.economy.rareGoods = rareGoods.split(',').map(s => s.trim()).filter(s => s)
    }
  }

  // 12. Meta Context
  const generationPurpose = getInputValue('meta_generationPurpose')
  if (generationPurpose) {
    context.meta = {
      generationPurpose: generationPurpose as any,
    }
    const preferredThemes = getInputValue('meta_preferredThemes')
    if (preferredThemes) {
      context.meta.preferredThemes = preferredThemes.split(',').map(s => s.trim()).filter(s => s)
    }
    const avoidThemes = getInputValue('meta_avoidThemes')
    if (avoidThemes) {
      context.meta.avoidThemes = avoidThemes.split(',').map(s => s.trim()).filter(s => s)
    }
    const targetCategory = getInputValue('meta_targetEntityCategory')
    if (targetCategory) {
      context.meta.targetEntityCategory = targetCategory
    }
  }

  return context
}

/**
 * Build GameMemory state from form fields
 */
function buildGameMemoryFromForm(): { entityMap: any, allItems: any[], allLocations: any[], allNPCs: any[] } {
  const entityMapStr = getInputValue('memory_entityMap')
  const allItemsStr = getInputValue('memory_allItems')
  const allLocationsStr = getInputValue('memory_allLocations')
  const allNPCsStr = getInputValue('memory_allNPCs')
  
  let entityMap = {}
  let allItems = []
  let allLocations = []
  let allNPCs = []
  
  try {
    entityMap = entityMapStr ? JSON.parse(entityMapStr) : {}
  } catch (e) {
    console.warn('Invalid entityMap JSON, using empty object', e)
  }
  
  try {
    allItems = allItemsStr ? JSON.parse(allItemsStr) : []
  } catch (e) {
    console.warn('Invalid allItems JSON, using empty array', e)
  }
  
  try {
    allLocations = allLocationsStr ? JSON.parse(allLocationsStr) : []
  } catch (e) {
    console.warn('Invalid allLocations JSON, using empty array', e)
  }
  
  try {
    allNPCs = allNPCsStr ? JSON.parse(allNPCsStr) : []
  } catch (e) {
    console.warn('Invalid allNPCs JSON, using empty array', e)
  }
  
  return { entityMap, allItems, allLocations, allNPCs }
}

/**
 * Populate GameMemory form fields from state
 */
function populateGameMemoryForm(entityMap: any, allItems: any[], allLocations: any[], allNPCs: any[]): void {
  const entityMapTextarea = document.getElementById('memory_entityMap') as HTMLTextAreaElement
  const allItemsTextarea = document.getElementById('memory_allItems') as HTMLTextAreaElement
  const allLocationsTextarea = document.getElementById('memory_allLocations') as HTMLTextAreaElement
  const allNPCsTextarea = document.getElementById('memory_allNPCs') as HTMLTextAreaElement
  
  if (entityMapTextarea) {
    entityMapTextarea.value = JSON.stringify(entityMap, null, 2)
  }
  if (allItemsTextarea) {
    allItemsTextarea.value = JSON.stringify(allItems, null, 2)
  }
  if (allLocationsTextarea) {
    allLocationsTextarea.value = JSON.stringify(allLocations, null, 2)
  }
  if (allNPCsTextarea) {
    allNPCsTextarea.value = JSON.stringify(allNPCs, null, 2)
  }
}

/**
 * Build GameRules from form fields
 */
function buildGameRulesFromForm(entityType: string): GameRules {
  const artStyle = getInputValue(`${entityType}_rules_artStyle`)
  const genre = getInputValue(`${entityType}_rules_genre`)
  const historicalPeriod = getInputValue(`${entityType}_rules_historicalPeriod`)
  const categoriesJSON = getInputValue(`${entityType}_rules_categories`)

  let categories = {}
  try {
    if (categoriesJSON) {
      categories = JSON.parse(categoriesJSON)
    }
  } catch (e) {
    console.warn('Invalid categories JSON, using empty object:', e)
  }

  return {
    artStyle,
    genre,
    historicalPeriod,
    categories,
  }
}

/**
 * Test Item Generation
 */
async function testItemGeneration(): Promise<void> {
  const promptInput = document.getElementById('itemPrompt') as HTMLInputElement
  const prompt = promptInput.value || 'Create a legendary fire sword'

  // Build shared context and item-specific rules from form
  const gameContext = buildGameContextFromForm()  // Shared for all entity types
  const gameRules = buildGameRulesFromForm('item')

  console.log('📝 Shared GameContext:', gameContext)
  console.log('📜 Item GameRules:', gameRules)

  // Show loading state
  showStructuredLoading('item')

  try {
    const result: GenerationResult<Item> = await createItem(prompt, gameContext, gameRules)
    displayEntityResult(result, 'item')
  } catch (error: any) {
    displayEntityError(error.message, 'item')
  }
}

/**
 * Test NPC Generation
 */
async function testNpcGeneration(): Promise<void> {
  const promptInput = document.getElementById('npcPrompt') as HTMLInputElement
  const prompt = promptInput.value || 'Create a legendary medieval blacksmith'

  // Build shared context and npc-specific rules from form
  const gameContext = buildGameContextFromForm()  // Shared for all entity types
  const gameRules = buildGameRulesFromForm('npc')

  console.log('📝 Shared GameContext:', gameContext)
  console.log('📜 NPC GameRules:', gameRules)

  // Show loading state
  showStructuredLoading('npc')

  try {
    const result: GenerationResult<NPC> = await createNpc(prompt, gameContext, gameRules)
    displayEntityResult(result, 'npc')
  } catch (error: any) {
    displayEntityError(error.message, 'npc')
  }
}

/**
 * Test Location Generation
 */
async function testLocationGeneration(): Promise<void> {
  const promptInput = document.getElementById('locationPrompt') as HTMLInputElement
  const prompt = promptInput.value || 'Create an ancient haunted fortress'

  // Build shared context and location-specific rules from form
  const gameContext = buildGameContextFromForm()  // Shared for all entity types
  const gameRules = buildGameRulesFromForm('location')

  console.log('📝 Shared GameContext:', gameContext)
  console.log('📜 Location GameRules:', gameRules)

  // Show loading state
  showStructuredLoading('location')

  try {
    const result: GenerationResult<Location> = await createLocation(prompt, gameContext, gameRules)
    displayEntityResult(result, 'location')
  } catch (error: any) {
    displayEntityError(error.message, 'location')
  }
}

/**
 * Display loading state
 */
function showStructuredLoading(entityType: string): void {
  const resultDiv = document.getElementById(`${entityType}Result`)
  if (!resultDiv) return

  resultDiv.style.display = 'block'
  resultDiv.classList.remove('error')
  resultDiv.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Step 0: Synthesizing context...</p>
            <p>Step 1: Generating base ${entityType}...</p>
            <p>Step 2: Generating game attributes...</p>
            <p>Step 3: Creating image...</p>
            <p>Step 4: Combining everything...</p>
            <p><strong>Please wait 15-25 seconds...</strong></p>
        </div>
    `
}

/**
 * Display entity result
 */
function displayEntityResult(result: GenerationResult<Item | NPC | Location>, entityType: string): void {
  const { entity, timing, newAttributes, debugData } = result
  const resultDiv = document.getElementById(`${entityType}Result`)
  if (!resultDiv) return

  // Validate required fields
  const validation = validateEntity(entity, entityType)

  // Check if new attributes were created
  const hasNewAttributes = newAttributes && Object.keys(newAttributes).length > 0

  resultDiv.innerHTML = `
        <div class="entity-result">
            <div class="result-header">
                <span class="entity-badge ${entityType}-badge">${entityType.toUpperCase()}</span>
                <span class="rarity-badge ${entity.rarity}">${entity.rarity}</span>
                ${validation.isValid ? '<span class="valid-badge">✓ Valid</span>' : '<span class="invalid-badge">✗ Invalid</span>'}
                ${hasNewAttributes ? '<span class="new-attr-badge">🆕 New Attributes</span>' : ''}
            </div>
            
            <h4>${entity.name}</h4>
            
            <div class="timing-info">
                <span>Base Entity: ${timing.baseEntity}ms</span>
                <span>Own Attributes: ${timing.attributes}ms</span>
                <span>Image: ${timing.image}ms</span>
                <span><strong>Total: ${timing.total}ms</strong></span>
            </div>
            
            ${!validation.isValid ? `<div class="validation-errors">Missing: ${validation.missing.join(', ')}</div>` : ''}
            
            ${
              hasNewAttributes
                ? `
                <div class="new-attributes-section">
                    <h5>🆕 New Attributes Created</h5>
                    <p>These attributes were not in the library:</p>
                    <pre><code>${JSON.stringify(newAttributes, null, 2)}</code></pre>
                </div>
            `
                : ''
            }
            
            <div class="entity-display">
                <div class="json-panel">
                    <h5>Generated JSON</h5>
                    <pre><code>${JSON.stringify(entity, null, 2)}</code></pre>
                    <button onclick="downloadJSON('${entityType}', ${JSON.stringify(JSON.stringify(entity))})">Download JSON</button>
                </div>
                
                <div class="image-panel">
                    <h5>Generated Image</h5>
                    <img src="${entity.image_url}" alt="${entity.name}">
                    <p class="description">${entity.description}</p>
                    <button onclick="downloadImage('${entity.image_url}', '${entity.id}')">Download Image</button>
                </div>
            </div>
            
            <!-- Debug Panel -->
            ${
              debugData
                ? `
            <div class="debug-section">
                <h4>🔍 Debug: LLM Prompts & Responses</h4>
                
                
                <details open>
                    <summary>Step 1: Base Entity JSON (${debugData.step1?.model || 'N/A'})</summary>
                    <div class="debug-step">
                        <strong>Model:</strong> ${debugData.step1?.model || 'N/A'}<br>
                        <strong>Schema:</strong> ${debugData.step1?.schema || 'N/A'}<br>
                        <strong>Prompt Sent:</strong>
                        <pre>${debugData.step1?.prompt || 'N/A'}</pre>
                        <strong>JSON Received:</strong>
                        <pre>${debugData.step1?.response || 'N/A'}</pre>
                    </div>
                </details>
                
                <details open>
                    <summary>Step 2: Attributes (${debugData.step2?.model || 'N/A'})</summary>
                    <div class="debug-step">
                        <strong>Model:</strong> ${debugData.step2?.model || 'N/A'}<br>
                        <strong>Available Attributes:</strong> ${debugData.step2?.availableAttributes?.join(', ') || 'None'}<br>
                        <strong>New Attributes Detected:</strong> ${debugData.step2?.newAttributesDetected?.join(', ') || 'None'}<br>
                        <strong>Prompt Sent:</strong>
                        <pre>${debugData.step2?.prompt || 'N/A'}</pre>
                        <strong>Attributes Received:</strong>
                        <pre>${debugData.step2?.response || 'N/A'}</pre>
                    </div>
                </details>
                
                <details open>
                    <summary>Step 3: Image Generation (${debugData.step3?.model || 'N/A'})</summary>
                    <div class="debug-step">
                        <strong>Model:</strong> ${debugData.step3?.model || 'N/A'}<br>
                        <strong>Prompt Sent:</strong>
                        <pre>${debugData.step3?.prompt || 'N/A'}</pre>
                        <strong>Result:</strong>
                        <pre>${debugData.step3?.response || 'N/A'}
Size: ${debugData.step3?.imageSize || 'N/A'}</pre>
                    </div>
                </details>
            </div>
            `
                : ''
            }
        </div>
    `
}

/**
 * Display error message
 */
function displayEntityError(message: string, entityType: string): void {
  const resultDiv = document.getElementById(`${entityType}Result`)
  if (!resultDiv) return

  resultDiv.classList.add('error')
  resultDiv.innerHTML = `
        <div class="error-message">
            <h4>❌ Generation Failed</h4>
            <p>${message}</p>
        </div>
    `
}

/**
 * Validate entity has all required fields
 */
function validateEntity(entity: any, entityType: string): { isValid: boolean; missing: string[] } {
  // Base entity fields
  const baseFields = ['id', 'name', 'rarity', 'description']

  // Own attributes field
  const attributeFields = ['own_attributes']

  // System-added required fields
  const systemFields = ['image_url', 'x', 'y', 'region']
  if (entityType === 'npc') {
    systemFields.push('chatHistory')
  }

  const allRequiredFields = [...baseFields, ...attributeFields, ...systemFields]
  const missing = allRequiredFields.filter(
    (field) => !entity.hasOwnProperty(field) || entity[field] === null || entity[field] === undefined
  )

  return {
    isValid: missing.length === 0,
    missing,
  }
}

/**
 * Download JSON file
 */
function downloadJSON(entityType: string, jsonString: string): void {
  const json = JSON.parse(jsonString)
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entityType}_${json.id || 'entity'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Download image
 */
function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${filename}.png`
  a.click()
}

// Make functions available globally
;(window as any).testItemGeneration = testItemGeneration
;(window as any).testNpcGeneration = testNpcGeneration
;(window as any).testLocationGeneration = testLocationGeneration
;(window as any).saveApiKey = saveApiKey
;(window as any).downloadJSON = downloadJSON
;(window as any).downloadImage = downloadImage

