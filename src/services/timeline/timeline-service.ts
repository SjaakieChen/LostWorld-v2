import { appendToTimeline, type Timeline, type TimelineEntry } from '../../context/timeline'

type TimelineResolver = () => Timeline | null | undefined
type TimelineUpdater = (timeline: Timeline) => void
type TurnResolver = () => number | null | undefined

interface TimelineContextHandle {
  getTimeline: TimelineResolver
  setTimeline: TimelineUpdater
  source?: string
}

interface TurnContextHandle {
  getCurrentTurn: TurnResolver
  source?: string
}

const timelineContextStack: TimelineContextHandle[] = []
const turnContextStack: TurnContextHandle[] = []

const removeFromStack = <T>(stack: T[], handle: T) => {
  const index = stack.lastIndexOf(handle)
  if (index >= 0) {
    stack.splice(index, 1)
  }
}

export const pushTimelineContext = (context: TimelineContextHandle): (() => void) => {
  timelineContextStack.push(context)
  return () => removeFromStack(timelineContextStack, context)
}

export const pushTurnContext = (context: TurnContextHandle): (() => void) => {
  turnContextStack.push(context)
  return () => removeFromStack(turnContextStack, context)
}

export const hasTimelineContext = () => timelineContextStack.length > 0
export const hasTurnContext = () => turnContextStack.length > 0

const resolveTimelineContext = (): TimelineContextHandle | null => {
  return timelineContextStack.length > 0
    ? timelineContextStack[timelineContextStack.length - 1]
    : null
}

const resolveTurn = (): number => {
  for (let index = turnContextStack.length - 1; index >= 0; index -= 1) {
    const resolver = turnContextStack[index]
    const value = resolver.getCurrentTurn()
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  console.warn(
    '[TimelineService] No turn context registered. Defaulting timeline entry turn to 0.'
  )
  return 0
}

export const getActiveTimeline = (): Timeline | null => {
  const context = resolveTimelineContext()
  const timeline = context?.getTimeline()
  return Array.isArray(timeline) ? timeline : null
}

export const logTimelineEvent = (tags: string[], text: string): TimelineEntry | null => {
  const context = resolveTimelineContext()
  if (!context) {
    console.warn(
      '[TimelineService] Attempted to log timeline event without an active timeline context.',
      { tags, text }
    )
    return null
  }

  const currentTimeline = context.getTimeline()
  if (!Array.isArray(currentTimeline)) {
    console.warn(
      '[TimelineService] Active timeline context did not provide a valid timeline array.',
      { tags, text }
    )
    return null
  }

  const turn = resolveTurn()
  const updatedTimeline = appendToTimeline(currentTimeline, tags, text, turn)
  context.setTimeline(updatedTimeline)

  return updatedTimeline[updatedTimeline.length - 1] ?? null
}


