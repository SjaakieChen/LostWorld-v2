import { getApiKey } from '../../config/gemini.config'
import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { GameConfiguration } from '../game-orchestrator/types'
import type { TimelineEntry } from '../../context/timeline'
import { getLLMTimelineTags } from './llm-registry'

const ADVISOR_LLM_MODEL = GEMINI_CONFIG.models.flash
const API_BASE_URL = GEMINI_CONFIG.apiBase

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
 * @returns Promise<string> - The LLM's complete response
 */
export async function generateChatResponse(
  userMessage: string,
  gameConfig: GameConfiguration | null,
  timeline: TimelineEntry[] = [],
  allowedTimelineTags?: string[]
): Promise<string> {
  // Get tags from registry if not provided
  const tags = allowedTimelineTags ?? getLLMTimelineTags('advisor-llm')
  const API_KEY = getApiKey()
  const endpoint = `${API_BASE_URL}/${ADVISOR_LLM_MODEL}:generateContent?key=${API_KEY}`

  // Get guide scratchpad (system instruction)
  const guideScratchpad = gameConfig?.theGuideScratchpad || 'No game configuration available.'

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

Provide helpful, immersive responses that:
- Use information from the Guide Scratchpad to maintain consistency
- Reference relevant timeline entries when appropriate
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
  filterTimelineByTags
}

