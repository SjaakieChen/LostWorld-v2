export type TimelineActor = 'user' | 'ai' | 'none'

export interface TimelineCoreTags {
  /**
   * Either "<regionName>:<x>:<y>" for concrete locations,
   * "unknown" when location cannot be resolved,
   * or "none" for truly locationless events (turn goals, global summaries).
   */
  location?: string
  /**
   * Semantic event type: e.g. "dialogue", "generation", "entityChange",
   * "turnProgression", "turnGoal", "playerAction", "statusChange", "none".
   */
  eventType?: string
  /**
   * Raw LLM identifier, e.g. "advisorLLM", "turnProgressionLLM", "orchestratorLLM".
   * Will be prefixed with "llm:" by the helper.
   */
  llmId?: string
  /**
   * Actor responsible for this event from the game's perspective.
   */
  actor?: TimelineActor
  /**
   * Optional extra tags for more granular classification.
   */
  extras?: string[]
}

export const TimelineEventTypes = {
  dialogue: 'dialogue',
  generation: 'generation',
  entityChange: 'entityChange',
  turnProgression: 'turnProgression',
  turnGoal: 'turnGoal',
  playerAction: 'playerAction',
  statusChange: 'statusChange',
  none: 'none'
} as const

export type TimelineEventType = (typeof TimelineEventTypes)[keyof typeof TimelineEventTypes]

export const TimelineLLMIds = {
  advisor: 'advisorLLM',
  turnProgression: 'turnProgressionLLM',
  orchestrator: 'orchestratorLLM',
  none: 'none'
} as const

export type TimelineLLMId = (typeof TimelineLLMIds)[keyof typeof TimelineLLMIds]

/**
 * Build a standardized tag array:
 * [loc:<...>, type:<...>, llm:<...>, actor:<...>, ...extras]
 */
export function buildTimelineTags(core: TimelineCoreTags): string[] {
  const locationValue = core.location?.trim() || 'none'
  const eventTypeValue = core.eventType?.trim() || 'none'
  const llmValue = core.llmId?.trim() || 'none'
  const actorValue: TimelineActor = core.actor || 'none'

  const locTag = `loc:${locationValue}`
  const typeTag = `type:${eventTypeValue}`
  const llmTag = `llm:${llmValue}`
  const actorTag = `actor:${actorValue}`

  return [locTag, typeTag, llmTag, actorTag, ...(core.extras ?? [])]
}


