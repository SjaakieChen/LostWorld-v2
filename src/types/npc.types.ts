import type { GeneratableEntity, ChatMessage } from './base.types'

// NPC interface - represents non-player characters
// Extends GeneratableEntity to include spatial and visual data
export interface NPC extends GeneratableEntity {
  chatHistory: ChatMessage[]  // Required: stores all conversation history with this NPC
  category?: string  // Optional: 'merchant', 'guard', 'quest_giver', 'enemy', etc.
  purpose: string  // Intended use/role of this NPC in the game, or "generic" if no specific purpose
}

