import type { GeneratableEntity, ChatMessage } from './base.types'

// NPC interface - represents non-player characters
// Extends GeneratableEntity to include spatial and visual data
export interface NPC extends GeneratableEntity {
  chatHistory: ChatMessage[]  // Required: stores all conversation history with this NPC
  role?: string  // Optional: 'merchant', 'guard', 'quest_giver', 'enemy', etc.
}

