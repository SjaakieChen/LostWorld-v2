import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { GameConfiguration } from '../game-orchestrator/types'
import type { TimelineEntry } from '../../context/timeline'
import { getLLMTimelineTags } from './llm-registry'
import type { Location, Item, NPC, Region } from '../../types'
import type { PlayerStats, PlayerStatus } from '../entity-generation/types'

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
  status: {
    health: number
    maxHealth: number
    energy: number
    maxEnergy: number
  }
  stats: Array<{
    name: string
    value: number
    tier: number
    tierName: string
    tierNames: string[]  // All tier names for progression context
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
  playerStatus: PlayerStatus,
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
    tierName: stat.tierNames[stat.tier - 1] || `Tier ${stat.tier}`,
    tierNames: stat.tierNames  // Include all tier names for context
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
    status: {
      health: playerStatus.health,
      maxHealth: playerStatus.maxHealth,
      energy: playerStatus.energy,
      maxEnergy: playerStatus.maxEnergy
    },
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
  parts.push(`- Coordinates: (${context.location.coordinates.x}, ${context.location.coordinates.y})`)
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
  
  // Player Status
  parts.push('PLAYER STATUS:')
  parts.push(`- Health: ${context.status.health}/${context.status.maxHealth}`)
  parts.push(`- Energy: ${context.status.energy}/${context.status.maxEnergy}`)
  parts.push('')
  
  // Player Stats
  parts.push('PLAYER STATS:')
  parts.push('IMPORTANT: Higher tier number is ALWAYS better than lower tier, regardless of value.')
  parts.push('For example, Tier 2 with value 10 is better than Tier 1 with value 100.')
  parts.push('Tier represents the primary skill level, value (0-100) represents progress within that tier.')
  parts.push('')
  context.stats.forEach(stat => {
    // Show tier as primary, value as secondary - emphasize tier importance
    const tierNamesList = stat.tierNames && stat.tierNames.length > 0
      ? ` | Tier progression: ${stat.tierNames.join(' → ')}`
      : ''
    parts.push(`- ${stat.name}: Tier ${stat.tier}/5 (Value: ${stat.value}/100) | Current Tier Name: ${stat.tierName}${tierNamesList}`)
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

export interface AdvisorLLMToolCall {
  name: string
  args: Record<string, any>
}

export interface AdvisorLLMResponse {
  text: string
  toolCalls: AdvisorLLMToolCall[]
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
      const hasConversationTag = ['user', 'chatbot', 'action'].some(tag => entry.tags.includes(tag))
      return hasAdvisorLLM && hasConversationTag
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
 * @returns Promise<AdvisorLLMResponse> - The LLM's response and any tool calls
 */
export async function generateChatResponse(
  userMessage: string,
  gameConfig: GameConfiguration | null,
  timeline: TimelineEntry[] = [],
  allowedTimelineTags?: string[],
  localContext?: LocalGameContext
): Promise<AdvisorLLMResponse> {
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
         `You are a advisor in a historical role-playing game. 

GAME DESIGN DOCUMENT (Guide Scratchpad):
${guideScratchpad}
${localContextText ? `\n\nCURRENT GAME STATE:\n${localContextText}` : ''}

Provide helpful, immersive responses that:
- Use information from the Guide Scratchpad to maintain consistency
- Reference relevant timeline entries when appropriate
- Use the current game state (location, inventory, stats, status, interactables) to provide context-aware responses
- When the player expresses an action they wish to take, call performPlayerAction with a concise description of their intent.
- Provide appropriately length responses that a real advisor would give.
- Provide narrative information that enhances the player's immersion
- Keep responses concise and immersive

Your role is to provide narrative information about the world, 
answer questions about the game setting, and help players understand the context and story.
You are also expected to answer questions about real historical events and figures.
And provide information about the game mechanics and progression system.

Roleplay as a advisor/narrator which act as an extension of the player. 
For example if the player is playing as a king and wants to implement a new law, you can only respond with 
I will tell this to the parlement. or whatever. You do not have the power to will things into existence you are a extension of the
player's will alone and not a god. If the player is playing as a spy or whatever you are still a extension of the player
but maybe not a advisor in the physical game world but still if the player wants to scout the area you can only tell him information that he could observe
and respond as a narrator like (you see ...). 
Depending on if you deem a players action to be able to performed immediatly like shouting looking around (narrate effect)
Or something that needs to be defered like raising taxes or planning a assault. (call the performPlayerAction function and act as an advisor
saying that you have told the ministers to work on it)

IMPORTANT!: If the player wants to perfom and action that is not plausible within the game world or his context
you should respond as a advisor telling the player why you cant or dont know how to do it. Do not call the 
tool performPlayerAction in this case.

         


` }]
    },
    generationConfig: {
      temperature: 0.8
    },
    tools: [
      {
        functionDeclarations: [
          {
            name: 'performPlayerAction',
            description: 'Record the action the player or the advisor representing the player has taken so the game can log it.',
            parameters: {
              type: 'OBJECT',
              properties: {
                description: {
                  type: 'STRING',
                  description: 'Short, specific summary of what the player or the advisor representing the player does.'
                }
              },
              required: ['description']
            }
          }
        ]
      }
    ]
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
    const parts: Array<{ text?: string; functionCall?: { name: string; args?: Record<string, any> } }> =
      data.candidates?.[0]?.content?.parts || []

    const toolCalls: AdvisorLLMToolCall[] = []
    const textChunks: string[] = []

    for (const part of parts) {
      if (part.text) {
        textChunks.push(part.text)
      }
      if (part.functionCall) {
        const { name, args } = part.functionCall
        toolCalls.push({
          name,
          args: (args ?? {}) as Record<string, any>
        })
      }
    }

    const text = textChunks.join('\n').trim()

    return {
      text: text || (toolCalls.length > 0 ? '' : 'No response generated'),
      toolCalls
    }
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

