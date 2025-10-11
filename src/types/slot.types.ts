import type { Item } from './item.types'

// Drag source types - where items can be dragged from
export type DragSourceType = 'inventory' | 'equipment' | 'interaction-input' | 'interaction-output'

// Drag source - contains item and location information
export interface DragSource {
  type: DragSourceType
  slotId: string  // Semantic slot ID (e.g., 'inv_slot_1', 'leftHand')
}

// Dragged item - represents an item currently being dragged
export interface DraggedItem {
  item: Item
  source: DragSource
}

