import type { TimelineEntry } from '../../context/timeline'

/**
 * Build a single formatted chat history string for a chat LLM.
 *
 * Rules:
 * - Dialogue entries (entries containing llmTag):
 *   - if tags include 'actor:user' -> "[Turn X] User: {text}"
 *   - if tags include 'actor:ai'   -> "[Turn X] Assistant: {text}"
 * - World entries (entries NOT containing llmTag):
 *   - include only if pass includeWorldTags filter
 *   - format: "[World][Turn X][tag1, tag2]: {text}"
 *
 * Window:
 * - If fromTurnsAgo != null: include entries where entry.turn >= currentTurn - fromTurnsAgo
 *   and entry.turn < currentTurn (exclude current turn by default; caller appends latest message)
 * - If fromTurnsAgo == null: include all entries with entry.turn < currentTurn
 */
export function buildChatHistory(
  timeline: TimelineEntry[],
  llmTag: string,
  currentTurn: number,
  fromTurnsAgo: number | null,
  includeWorldTags: 'all' | string[] = 'all'
): string {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return ''
  }

  const minTurn = fromTurnsAgo != null ? currentTurn - fromTurnsAgo : -Infinity

  const inWindow = (entry: TimelineEntry): boolean => {
    const turn = entry.turn ?? 0
    return turn >= minTurn && turn < currentTurn
  }

  const hasTag = (entry: TimelineEntry, tag: string) => entry.tags.includes(tag)
  const containsAny = (entry: TimelineEntry, tags: string[]) => entry.tags.some(t => tags.includes(t))

  // Separate dialogue vs world based on llmTag presence
  const dialogueEntries = timeline
    .filter(inWindow)
    .filter(entry => hasTag(entry, llmTag))
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0))

  const worldEntries = timeline
    .filter(inWindow)
    .filter(entry => !hasTag(entry, llmTag))
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0))
    .filter(entry => {
      if (includeWorldTags === 'all') return true
      return containsAny(entry, includeWorldTags)
    })

  const lines: string[] = []

  for (const entry of dialogueEntries) {
    const turnLabel = `[Turn ${entry.turn}]`
    if (entry.tags.includes('actor:user')) {
      lines.push(`${turnLabel} User: ${entry.text}`)
    } else if (entry.tags.includes('actor:ai')) {
      lines.push(`${turnLabel} Assistant: ${entry.text}`)
    }
  }

  for (const entry of worldEntries) {
    const turnLabel = `[Turn ${entry.turn}]`
    const tagLabel = entry.tags.join(', ')
    lines.push(`[World]${turnLabel}[${tagLabel}]: ${entry.text}`)
  }

  return lines.join('\n')
}

/**
 * Build dialogue-only messages and separate world text for system prompt
 */
export function buildDialogueAndWorld(
  timeline: TimelineEntry[],
  llmTag: string,
  currentTurn: number,
  fromTurnsAgo: number | null,
  includeWorldTags: 'all' | string[] = 'all',
  dialogueTags: string[] = ['actor:user', 'actor:ai']
): {
  messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  worldText: string
} {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return { messages: [], worldText: '' }
  }

  const minTurn = fromTurnsAgo != null ? currentTurn - fromTurnsAgo : -Infinity
  const inWindow = (entry: TimelineEntry): boolean => {
    const turn = entry.turn ?? 0
    return turn >= minTurn && turn < currentTurn
  }
  const hasTag = (entry: TimelineEntry, tag: string) => entry.tags.includes(tag)
  const containsAny = (entry: TimelineEntry, tags: string[]) => entry.tags.some(t => tags.includes(t))

  const dialogueEntries = timeline
    .filter(inWindow)
    .filter(entry => hasTag(entry, llmTag))
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0))

  const worldEntries = timeline
    .filter(inWindow)
    .filter(entry => !hasTag(entry, llmTag))
    .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0))
    .filter(entry => {
      if (includeWorldTags === 'all') return true
      return containsAny(entry, includeWorldTags)
    })

  const messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  for (const entry of dialogueEntries) {
    const prefix = entry.turn != null ? `[Turn ${entry.turn}] ` : ''
    const [userTag, assistantTag] = [dialogueTags[0] ?? 'actor:user', dialogueTags[1] ?? 'actor:ai']
    if (entry.tags.includes(userTag)) {
      messages.push({ role: 'user', parts: [{ text: `${prefix}${entry.text}` }] })
    } else if (entry.tags.includes(assistantTag)) {
      messages.push({ role: 'model', parts: [{ text: `${prefix}${entry.text}` }] })
    }
  }

  const worldLines: string[] = []
  for (const entry of worldEntries) {
    const turnLabel = `[Turn ${entry.turn}]`
    const tagLabel = entry.tags.join(', ')
    worldLines.push(`[World]${turnLabel}[${tagLabel}]: ${entry.text}`)
  }

  return { messages, worldText: worldLines.join('\n') }
}


