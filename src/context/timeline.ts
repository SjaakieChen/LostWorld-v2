/**
 * Timeline System - Chronological log of game events with tags
 * 
 * The Timeline is used to track game events, player actions, NPC dialogue,
 * system events, and turn goals. This data will be synthesized by theCanon
 * for different LLM contexts.
 */

export interface TimelineEntry {
  id: string  // Unique identifier (timestamp-based)
  tag: string  // Tag like "[turngoal]", "[system]", "[npc_...]", "[player_action]"
  text: string  // The actual text content
  timestamp: number  // When it was created
  turn: number  // What turn this occurred in
}

export type Timeline = TimelineEntry[]

/**
 * Append a new entry to the timeline
 * 
 * @param timeline - Current timeline array
 * @param tag - Tag for the entry (e.g., "[turngoal]", "[system]", "[npc_merchant_001]")
 * @param text - The text content to append
 * @param turn - Current turn number
 * @returns New timeline with the appended entry
 */
export function appendToTimeline(
  timeline: Timeline,
  tag: string,
  text: string,
  turn: number
): Timeline {
  const entry: TimelineEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tag,
    text,
    timestamp: Date.now(),
    turn
  }
  return [...timeline, entry]
}

