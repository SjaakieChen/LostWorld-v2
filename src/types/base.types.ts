// Rarity levels for all game entities
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

// Chat message structure for NPC conversations
export interface ChatMessage {
  id: string
  type: 'player' | 'npc'
  text: string
  timestamp: number
}

// Attribute with full metadata
export interface Attribute {
  value: any
  type: 'integer' | 'number' | 'string' | 'boolean' | 'array'
  description: string
  reference: string
}

// Base interface for all generatable entities (Items, NPCs, Locations)
// These can be created by LLM and share common properties
export interface GeneratableEntity {
  // Core Identity
  id: string            // Semantic ID: itemtype_001, npc_role_001, loc_name_001
  name: string          // Display name
  rarity: Rarity        // Rarity level
  category?: string     // Entity category (weapon, armor, merchant, town, etc.)
  
  // Visual/Display (for Google ImageGen integration)
  image_url: string     // URL or path to generated image
  visualDescription: string   // Visual description for image generation
  functionalDescription?: string   // Functional description (what it does/how it works)
  
  // Spatial Location (ALL entities exist somewhere in the world)
  x: number            // X coordinate within region (unbounded, can be negative)
  y: number            // Y coordinate within region (unbounded, can be negative)
  region: string       // Region ID where entity exists (e.g., 'region_medieval_kingdom_001')
  
  // Attributes with full metadata (replaces properties)
  own_attributes?: Record<string, Attribute>
}

