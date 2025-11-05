import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { GameConfiguration } from '../game-orchestrator/types'
import type { TimelineEntry } from '../../context/timeline'
import { getLLMTimelineTags } from './llm-registry'

const DEFAULT_CHAT_AREA_LLM_MODEL = GEMINI_CONFIG.models.flash
const API_BASE_URL = GEMINI_CONFIG.apiBase

/**
 * Filter timeline entries by tags
 * Tags are TBD - this is a placeholder that can be configured
 * @param timeline - Array of timeline entries
 * @param allowedTags - Array of tag prefixes to include (e.g., ['[turngoal]', '[system]'])
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
    return allowedTags.some(tag => entry.tag.startsWith(tag))
  })
}

/**
 * Format timeline entries for inclusion in prompt
 * @param entries - Array of timeline entries
 * @returns Formatted string representation
 */
function formatTimelineEntries(entries: TimelineEntry[]): string {
  if (entries.length === 0) {
    return 'No relevant timeline entries.'
  }
  
  return entries.map(entry => {
    return `[${entry.tag}] Turn ${entry.turn}: ${entry.text}`
  }).join('\n')
}

/**
 * Generate a chat response using DefaultChatAreaLLM (Gemini 2.5 Flash)
 * 
 * @param userMessage - The user's message/question
 * @param gameConfig - Game configuration containing guideScratchpad
 * @param timeline - Full timeline array
 * @param allowedTimelineTags - Optional tags to filter from timeline. If not provided, uses registry config
 * @returns Promise<string> - The LLM's response
 */
export async function generateChatResponse(
  userMessage: string,
  gameConfig: GameConfiguration | null,
  timeline: TimelineEntry[] = [],
  allowedTimelineTags?: string[]
): Promise<string> {
  // Get tags from registry if not provided
  const tags = allowedTimelineTags ?? getLLMTimelineTags('default-chat-area-llm')
  const API_KEY = getApiKey()
  const endpoint = `${API_BASE_URL}/${DEFAULT_CHAT_AREA_LLM_MODEL}:generateContent?key=${API_KEY}`

  // Get guide scratchpad
  const guideScratchpad = gameConfig?.theGuideScratchpad || 'No game configuration available.'

  // Filter timeline entries by allowed tags
  const relevantTimelineEntries = filterTimelineByTags(timeline, tags)

  // Format timeline for prompt
  const timelineContext = formatTimelineEntries(relevantTimelineEntries)

  const prompt = `You are a helpful narrative guide in a historical role-playing game. Your role is to provide narrative information about the world, answer questions about the game setting, and help players understand the context and story.

GAME DESIGN DOCUMENT (Guide Scratchpad):
${guideScratchpad}

RELEVANT TIMELINE ENTRIES:
${timelineContext}

USER QUESTION: ${userMessage}

Provide a helpful, immersive response that:
- Uses information from the Guide Scratchpad to maintain consistency
- References relevant timeline entries when appropriate
- Stays true to the historical period and game setting
- Provides narrative information that enhances the player's understanding
- Keeps responses concise but informative

Your response:`

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    temperature: 0.7
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
      const errorData = await response.json()
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
 * DefaultChatAreaLLM - Main export for the chat area LLM service
 */
export const DefaultChatAreaLLM = {
  generateChatResponse,
  filterTimelineByTags
}

