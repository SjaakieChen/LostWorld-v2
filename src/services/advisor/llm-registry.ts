import { GEMINI_CONFIG } from '../../config/gemini.config'
/**
 * LLM Configuration - Defines all LLMs in the system
 * This registry tracks which model each LLM uses and what tags they have access to
 */

export interface LLMConfig {
  id: string
  name: string
  model: string
  description: string
  allwedreadtimelinetags: string[]  // Tags from timeline this LLM can access (using standardized schema)
  purpose: string
  ownTag?: string                 // The LLM's own dialogue tag (e.g., 'llm:advisorLLM')
  allowedDialogueTags?: string[]  // Tags considered dialogue within ownTag (e.g., ['actor:user','actor:ai'])
  allowedWorldTags?: string[]     // Non-own tags allowed into system prompt (e.g., ['type:turnGoal', ...])
  maxDialogueTurnsBack?: number | null
  maxWorldTurnsBack?: number | null
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
    allwedreadtimelinetags: [
      'llm:advisorLLM',
      'type:dialogue',
      'type:playerAction',
      'type:turnGoal',
      'type:turnProgression',
      'type:entityChange',
      'type:generation'
    ],
    purpose: 'User chat interface for narrative information and world context',
    ownTag: 'llm:advisorLLM',
    allowedDialogueTags: ['actor:user', 'actor:ai'],
    allowedWorldTags: ['type:turnGoal', 'type:turnProgression', 'type:entityChange', 'type:playerAction', 'type:generation'],
    maxDialogueTurnsBack: null,
    maxWorldTurnsBack: 2
  },
  {
    id: 'orchestrator',
    name: 'Game Orchestrator',
    model: GEMINI_CONFIG.models.pro,
    description: 'Generates initial game configuration and orchestrates game setup',
    allwedreadtimelinetags: [], // Orchestrator doesn't use timeline in initial setup
    purpose: 'Game configuration and setup generation'
  },
  {
    id: 'entity-generator',
    name: 'Entity Generator',
    model: GEMINI_CONFIG.models.flashLite,
    description: 'Generates game entities (items, NPCs, locations, regions)',
    allwedreadtimelinetags: [], // Entity generator may use timeline in future
    purpose: 'Entity generation with structured output'
  },
  {
    id: 'image-generator',
    name: 'Image Generator',
    model: GEMINI_CONFIG.models.flashImage,
    description: 'Generates images for entities and game content',
    allwedreadtimelinetags: [], // Image generator doesn't use timeline
    purpose: 'Image generation for entities'
  },
  {
    id: 'turn-progression-llm',
    name: 'Turn Progression LLM',
    model: GEMINI_CONFIG.models.pro,
    description: 'World simulation LLM that progresses the game world at the end of each turn',
    allwedreadtimelinetags: [
      'llm:turnProgressionLLM',
      'type:turnProgression',
      'type:entityChange',
      'type:turnGoal',
      'type:playerAction',
      'type:statusChange',
      'type:generation'
    ],
    purpose: 'World simulation and turn progression management',
    maxDialogueTurnsBack: null,
    maxWorldTurnsBack: 1
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
  return config?.allwedreadtimelinetags || []
}

export function getLLMOwnTag(id: string): string | undefined {
  return getLLMConfig(id)?.ownTag
}

export function getLLMAllowedDialogueTags(id: string): string[] {
  return getLLMConfig(id)?.allowedDialogueTags ?? ['user', 'chatbot']
}

export function getLLMAllowedWorldTags(id: string): string[] {
  return getLLMConfig(id)?.allowedWorldTags ?? []
}

export function getLLMDialogueWindow(id: string): number | null {
  const config = getLLMConfig(id)
  if (config == null || config.maxDialogueTurnsBack == null) {
    return null
  }
  return config.maxDialogueTurnsBack
}

export function getLLMWorldWindow(id: string): number | null {
  const config = getLLMConfig(id)
  if (config == null || config.maxWorldTurnsBack == null) {
    return null
  }
  return config.maxWorldTurnsBack
}

