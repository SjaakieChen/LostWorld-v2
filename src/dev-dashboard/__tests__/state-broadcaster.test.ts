import { StateBroadcaster } from '../state-broadcaster'
import { MemoryTransport } from '../transport'
import type { DashboardMessage, DashboardMessagePayloadMap, DashboardMessageType } from '../messages'

type TestCase = {
  name: string
  fn: () => void
}

const tests: TestCase[] = []

function test(name: string, fn: () => void) {
  tests.push({ name, fn })
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function getPublishedMessage(transport: MemoryTransport): DashboardMessage {
  assert(transport.messages.length === 1, `Expected exactly one message, received ${transport.messages.length}`)
  return transport.messages[0]
}

function expectMessageType<T extends DashboardMessageType>(
  message: DashboardMessage,
  type: T
): asserts message is Extract<DashboardMessage, { type: T }> {
  if (message.type !== type) {
    throw new Error(`Expected ${type} message, received ${message.type}`)
  }
}

function expectMessageWithData<T extends DashboardMessageType>(
  message: DashboardMessage,
  type: T
): DashboardMessagePayloadMap[T] {
  expectMessageType(message, type)
  if (!('data' in message)) {
    throw new Error(`Expected ${type} message to include data payload`)
  }
  return message.data as DashboardMessagePayloadMap[T]
}

test('broadcastEntityStorage computes counts when omitted', () => {
  const transport = new MemoryTransport()
  const broadcaster = new StateBroadcaster({
    transport,
    logger: () => {}
  })

  broadcaster.broadcastEntityStorage({
    allItems: [{ id: 'item_1' }],
    allLocations: [{ id: 'loc_1' }],
    allNPCs: [],
    allRegions: [{ id: 'region_1' }]
  })

  const message = getPublishedMessage(transport)
  const data = expectMessageWithData(message, 'ENTITY_STORAGE')
  assert(data.counts.items === 1, 'Expected item count to be derived from payload')
  assert(data.counts.locations === 1, 'Expected location count to be derived from payload')
  assert(data.entityMapSize === 1, 'Expected entityMapSize to default to item count')
})

test('broadcastOrchestratorOperation assigns operationId when missing', () => {
  const transport = new MemoryTransport()
  const broadcaster = new StateBroadcaster({
    transport,
    logger: () => {}
  })

  broadcaster.broadcastOrchestratorOperation({
    operationType: 'test_operation',
    success: true
  })

  const message = getPublishedMessage(transport)
  const data = expectMessageWithData(message, 'ORCHESTRATOR_OPERATION')
  assert(Boolean(data.operationId), 'Expected operationId to be generated')
  assert(data.operationType === 'test_operation', 'Expected operation type to be preserved')
})

test('broadcastEntityHistoryReset emits data-less message', () => {
  const transport = new MemoryTransport()
  const broadcaster = new StateBroadcaster({
    transport,
    logger: () => {}
  })

  broadcaster.broadcastEntityHistoryReset()
  const message = getPublishedMessage(transport)
  assert(message.type === 'ENTITY_HISTORY_RESET', 'Expected ENTITY_HISTORY_RESET message')
  assert(!('data' in message), 'Expected no data payload for reset message')
})

;(() => {
  const results = tests.map(({ name, fn }) => {
    try {
      fn()
      console.log(`✅ ${name}`)
      return { name, passed: true }
    } catch (error) {
      console.error(`❌ ${name}`, error)
      return { name, passed: false, error }
    }
  })

  const failed = results.filter(result => !result.passed)
  if (failed.length > 0) {
    throw new Error(`${failed.length} test(s) failed`)
  }
})()

