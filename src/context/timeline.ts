/**
 * Timeline System - Chronological log of game events with tags
 * 
 * The Timeline is used to track game events, player actions, NPC dialogue,
 * system events, and turn goals. This data will be synthesized by theCanon
 * for different LLM contexts.
 */

export interface TimelineEntry {
  id: string  // Unique identifier (timestamp-based)
  tags: string[]  // Array of tags like ["user", "advisorLLM"] or ["generation", "region"]
  text: string  // The actual text content
  timestamp: number  // When it was created
  turn: number  // What turn this occurred in
}

export type Timeline = TimelineEntry[]

/**
 * Append a new entry to the timeline
 * 
 * @param timeline - Current timeline array
 * @param tags - Array of tags for the entry (e.g., ["user", "advisorLLM"] or ["generation", "region"])
 * @param text - The text content to append
 * @param turn - Current turn number
 * @returns New timeline with the appended entry
 */
export function appendToTimeline(
  timeline: Timeline,
  tags: string[],
  text: string,
  turn: number
): Timeline {
  const entry: TimelineEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tags,
    text,
    timestamp: Date.now(),
    turn
  }
  return [...timeline, entry]
}

