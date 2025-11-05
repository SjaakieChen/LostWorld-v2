import { GEMINI_CONFIG } from '../../config/gemini.config'
import type { TimelineEntry } from '../../context/timeline'

/**
 * LLM Configuration - Defines all LLMs in the system
 * This registry tracks which model each LLM uses and what tags they have access to
 */

export interface LLMConfig {
  id: string
  name: string
  model: string
  description: string
  allowedTimelineTags: string[]  // Tags from timeline this LLM can access
  purpose: string
}

/**
 * Registry of all LLMs in the system
 */
export const LLM_REGISTRY: LLMConfig[] = [
  {
    id: 'advisor-llm',
    name: 'Advisor LLM',
    model: GEMINI_CONFIG.models.flash,
    description: 'Provides narrative information and answers questions about the game world',
    allowedTimelineTags: ['advisorLLM'], // Will filter for entries with this tag AND ('user' or 'chatbot')
    purpose: 'User chat interface for narrative information and world context'
  },
  {
    id: 'orchestrator',
    name: 'Game Orchestrator',
    model: GEMINI_CONFIG.models.pro,
    description: 'Generates initial game configuration and orchestrates game setup',
    allowedTimelineTags: [], // Orchestrator doesn't use timeline in initial setup
    purpose: 'Game configuration and setup generation'
  },
  {
    id: 'entity-generator',
    name: 'Entity Generator',
    model: GEMINI_CONFIG.models.flashLite,
    description: 'Generates game entities (items, NPCs, locations, regions)',
    allowedTimelineTags: [], // Entity generator may use timeline in future
    purpose: 'Entity generation with structured output'
  },
  {
    id: 'image-generator',
    name: 'Image Generator',
    model: GEMINI_CONFIG.models.flashImage,
    description: 'Generates images for entities and game content',
    allowedTimelineTags: [], // Image generator doesn't use timeline
    purpose: 'Image generation for entities'
  }
]

/**
 * Get LLM configuration by ID
 */
export function getLLMConfig(id: string): LLMConfig | undefined {
  return LLM_REGISTRY.find(llm => llm.id === id)
}

/**
 * Get all LLM configurations
 */
export function getAllLLMConfigs(): LLMConfig[] {
  return LLM_REGISTRY
}

/**
 * Get timeline tags for a specific LLM
 */
export function getLLMTimelineTags(llmId: string): string[] {
  const config = getLLMConfig(llmId)
  return config?.allowedTimelineTags || []
}

