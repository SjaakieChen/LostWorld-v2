import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { GameConfiguration } from '../game-orchestrator/types'
import type { TimelineEntry } from '../../context/timeline'
import { getLLMTimelineTags } from './llm-registry'
import type { Location, Item, NPC, Region } from '../../types'
import type { PlayerStats } from '../entity-generation/types'

const ADVISOR_LLM_MODEL = GEMINI_CONFIG.models.flash
const API_BASE_URL = GEMINI_CONFIG.apiBase

/**
 * LocalGameContext - Reusable data package for current game state
 * Provides LLMs with current location, inventory, stats, and interactable entities
 * Includes visual and functional descriptions but NOT full attributes
 */
export interface LocalGameContext {
  location: {
    name: string
    visualDescription: string
    functionalDescription?: string
    regionName: string
    coordinates: { x: number; y: number }
  }
  inventory: Array<{
    name: string
    visualDescription: string
    functionalDescription?: string
  }>
  stats: Array<{
    name: string
    value: number
    tier: number
    tierName: string
  }>
  interactableNPCs: Array<{
    name: string
    visualDescription: string
    functionalDescription?: string
  }>
  interactableItems: Array<{
    name: string
    visualDescription: string
    functionalDescription?: string
  }>
}

/**
 * Get LocalGameContext from player state
 * Builds a reusable context package for LLMs
 */
export function getLocalGameContext(
  currentLocation: Location,
  currentRegion: Region,
  inventorySlots: Record<string, string | null>,
  playerStats: PlayerStats,
  interactableNPCs: NPC[],
  interactableItems: Item[],
  getAllItemById: (id: string) => Item | undefined
): LocalGameContext {
  // Get inventory items from slots
  const inventory: LocalGameContext['inventory'] = []
  for (const itemId of Object.values(inventorySlots)) {
    if (itemId) {
      const item = getAllItemById(itemId)
      if (item) {
        inventory.push({
          name: item.name,
          visualDescription: item.visualDescription,
          functionalDescription: item.functionalDescription
        })
      }
    }
  }

  // Format player stats
  const stats: LocalGameContext['stats'] = Object.entries(playerStats).map(([name, stat]) => ({
    name,
    value: stat.value,
    tier: stat.tier,
    tierName: stat.tierNames[stat.tier - 1] || `Tier ${stat.tier}`
  }))

  // Format interactable NPCs
  const npcs: LocalGameContext['interactableNPCs'] = interactableNPCs.map(npc => ({
    name: npc.name,
    visualDescription: npc.visualDescription,
    functionalDescription: npc.functionalDescription
  }))

  // Format interactable items
  const items: LocalGameContext['interactableItems'] = interactableItems.map(item => ({
    name: item.name,
    visualDescription: item.visualDescription,
    functionalDescription: item.functionalDescription
  }))

  return {
    location: {
      name: currentLocation.name,
      visualDescription: currentLocation.visualDescription,
      functionalDescription: currentLocation.functionalDescription,
      regionName: currentRegion.name,
      coordinates: { x: currentLocation.x, y: currentLocation.y }
    },
    inventory,
    stats,
    interactableNPCs: npcs,
    interactableItems: items
  }
}

/**
 * Format LocalGameContext as readable text for LLM prompt
 */
function formatLocalGameContext(context: LocalGameContext): string {
  const parts: string[] = []
  
  // Location
  parts.push('CURRENT LOCATION:')
  parts.push(`- Name: ${context.location.name}`)
  parts.push(`- Visual Description: ${context.location.visualDescription}`)
  if (context.location.functionalDescription) {
    parts.push(`- Functional Description: ${context.location.functionalDescription}`)
  }
  parts.push(`- Region: ${context.location.regionName}`)
  parts.push(`- Coordinates: (${context.location.x}, ${context.location.y})`)
  parts.push('')
  
  // Inventory
  parts.push('INVENTORY:')
  if (context.inventory.length === 0) {
    parts.push('- Empty')
  } else {
    context.inventory.forEach((item, index) => {
      parts.push(`${index + 1}. ${item.name}`)
      parts.push(`   Visual: ${item.visualDescription}`)
      if (item.functionalDescription) {
        parts.push(`   Functional: ${item.functionalDescription}`)
      }
    })
  }
  parts.push('')
  
  // Player Stats
  parts.push('PLAYER STATS:')
  context.stats.forEach(stat => {
    parts.push(`- ${stat.name}: ${stat.value}/100 (${stat.tierName}, Tier ${stat.tier}/5)`)
  })
  parts.push('')
  
  // Interactable NPCs
  parts.push('INTERACTABLE NPCS AT LOCATION:')
  if (context.interactableNPCs.length === 0) {
    parts.push('- None')
  } else {
    context.interactableNPCs.forEach((npc, index) => {
      parts.push(`${index + 1}. ${npc.name}`)
      parts.push(`   Visual: ${npc.visualDescription}`)
      if (npc.functionalDescription) {
        parts.push(`   Functional: ${npc.functionalDescription}`)
      }
    })
  }
  parts.push('')
  
  // Interactable Items
  parts.push('INTERACTABLE ITEMS AT LOCATION:')
  if (context.interactableItems.length === 0) {
    parts.push('- None')
  } else {
    context.interactableItems.forEach((item, index) => {
      parts.push(`${index + 1}. ${item.name}`)
      parts.push(`   Visual: ${item.visualDescription}`)
      if (item.functionalDescription) {
        parts.push(`   Functional: ${item.functionalDescription}`)
      }
    })
  }
  
  return parts.join('\n')
}

/**
 * Filter timeline entries by tags
 * For advisorLLM: finds entries with 'advisorLLM' tag, then checks for 'user' or 'chatbot'
 * @param timeline - Array of timeline entries
 * @param allowedTags - Array of tags to include (e.g., ['advisorLLM'])
 * @returns Filtered timeline entries
 */
export function filterTimelineByTags(
  timeline: TimelineEntry[],
  allowedTags: string[] = []
): TimelineEntry[] {
  if (allowedTags.length === 0) {
    // If no tags specified, return all entries (placeholder behavior)
    return timeline
  }
  
  return timeline.filter(entry => {
    // For advisorLLM filtering:
    // 1. Entry must have 'advisorLLM' in its tags array
    // 2. Entry must also have 'user' or 'chatbot' in its tags array
    if (allowedTags.includes('advisorLLM')) {
      const hasAdvisorLLM = entry.tags.includes('advisorLLM')
      const hasUserOrChatbot = entry.tags.includes('user') || entry.tags.includes('chatbot')
      return hasAdvisorLLM && hasUserOrChatbot
    }
    
    // For other tags, check if any of the allowed tags are in the entry's tags array
    return allowedTags.some(tag => entry.tags.includes(tag))
  })
}

/**
 * Format timeline entries as dialogue history for LLM prompt
 * Formats entries as: User: {text} / Assistant: {text}
 * @param entries - Array of timeline entries (should be filtered by chatbot tags)
 * @returns Formatted dialogue string
 */
function formatTimelineAsDialogue(entries: TimelineEntry[]): string {
  if (entries.length === 0) {
    return ''
  }
  
  return entries.map(entry => {
    // Check tags array for 'user' or 'chatbot'
    if (entry.tags.includes('user')) {
      return `User: ${entry.text}`
    } else if (entry.tags.includes('chatbot')) {
      return `Assistant: ${entry.text}`
    }
    // Fallback for any other tags (shouldn't happen if filtering works correctly)
    return `[${entry.tags.join(', ')}]: ${entry.text}`
  }).join('\n')
}

/**
 * Generate a chat response using advisorLLM (Gemini 2.5 Flash)
 * 
 * @param userMessage - The user's message/question
 * @param gameConfig - Game configuration containing guideScratchpad
 * @param timeline - Full timeline array
 * @param allowedTimelineTags - Optional tags to filter from timeline. If not provided, uses registry config
 * @param localContext - Optional local game context (location, inventory, stats, interactables)
 * @returns Promise<string> - The LLM's complete response
 */
export async function generateChatResponse(
  userMessage: string,
  gameConfig: GameConfiguration | null,
  timeline: TimelineEntry[] = [],
  allowedTimelineTags?: string[],
  localContext?: LocalGameContext
): Promise<string> {
  // Get tags from registry if not provided
  const tags = allowedTimelineTags ?? getLLMTimelineTags('advisor-llm')
  const API_KEY = getApiKey()
  const endpoint = `${API_BASE_URL}/${ADVISOR_LLM_MODEL}:generateContent?key=${API_KEY}`

  // Get guide scratchpad (system instruction)
  const guideScratchpad = gameConfig?.theGuideScratchpad || 'No game configuration available.'
  
  // Format local context if provided
  const localContextText = localContext ? formatLocalGameContext(localContext) : ''

  // Filter timeline entries by allowed tags (chatbot conversation history)
  const relevantTimelineEntries = filterTimelineByTags(timeline, tags)

  // Format timeline as dialogue history
  const dialogueHistory = formatTimelineAsDialogue(relevantTimelineEntries)

  // Build contents array with dialogue history + current user message
  const contents: Array<{ role?: string; parts: Array<{ text: string }> }> = []
  
  // Add dialogue history if exists
  if (dialogueHistory) {
    // Split dialogue history into individual messages
    const dialogueLines = dialogueHistory.split('\n')
    for (const line of dialogueLines) {
      if (line.startsWith('User: ')) {
        contents.push({
          role: 'user',
          parts: [{ text: line.substring(6) }] // Remove "User: " prefix
        })
      } else if (line.startsWith('Assistant: ')) {
        contents.push({
          role: 'model',
          parts: [{ text: line.substring(11) }] // Remove "Assistant: " prefix
        })
      }
    }
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  })

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text:
         `You are a helpful advisor in a historical role-playing game. 
         Your role is to provide narrative information about the world, 
         answer questions about the game setting, and help players understand the context and story.
         You are also expected to answer questions about real historical events and figures.
         And provide information about the game mechanics and progression system.

GAME DESIGN DOCUMENT (Guide Scratchpad):
${guideScratchpad}
${localContextText ? `\n\nCURRENT GAME STATE:\n${localContextText}` : ''}

Provide helpful, immersive responses that:
- Use information from the Guide Scratchpad to maintain consistency
- Reference relevant timeline entries when appropriate
- Use the current game state (location, inventory, stats, interactables) to provide context-aware responses
- Stay true to the historical period and game setting
- Provide narrative information that enhances the player's immersion
- Keep responses concise but informative` }]
    },
    generationConfig: {
      temperature: 0.8
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
    
    return text
  } catch (error: any) {
    throw new Error(`Chat response generation failed: ${error.message}`)
  }
}

/**
 * advisorLLM - Main export for the chat area LLM service
 */
export const advisorLLM = {
  generateChatResponse,
  filterTimelineByTags,
  getLocalGameContext
}

