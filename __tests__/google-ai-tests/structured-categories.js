// Google Gemini Structured Output - Category Constants and ID Generation
// Hardcoded category definitions and auto-incrementing ID system

// ============================================================================
// CATEGORY ENUMS
// ============================================================================

const ITEM_CATEGORIES = ["weapon", "armor", "consumable"];
const NPC_CATEGORIES = ["merchant", "guard", "quest_giver"];
const LOCATION_CATEGORIES = ["town", "dungeon", "building", "wilderness"];

// ============================================================================
// CATEGORY PREFIX MAPPINGS
// ============================================================================

const ITEM_CATEGORY_PREFIXES = {
    weapon: "wea",
    armor: "arm",
    consumable: "con"
};

const NPC_CATEGORY_PREFIXES = {
    merchant: "mer",
    guard: "gua",
    quest_giver: "que"
};

const LOCATION_CATEGORY_PREFIXES = {
    town: "tow",
    dungeon: "dun",
    building: "bui",
    wilderness: "wil"
};

// ============================================================================
// AUTO-INCREMENTING COUNTER SYSTEM
// ============================================================================

/**
 * Counters track how many entities of each category have been generated
 * Structure: { item: { weapon: 2, armor: 1 }, npc: { merchant: 3 }, ... }
 */
const entityCounters = {
    item: {},      // { weapon: 1, armor: 0, consumable: 2 }
    npc: {},       // { merchant: 1, guard: 0, quest_giver: 0 }
    location: {}   // { town: 0, dungeon: 1, building: 0, wilderness: 0 }
};

/**
 * Generate next sequential ID for an entity
 * @param {string} entityType - Type of entity: 'item', 'npc', or 'location'
 * @param {string} category - Category within the entity type (e.g., 'weapon', 'merchant')
 * @param {string} name - Display name of the entity (will be sanitized for ID)
 * @returns {string} Formatted ID like "wea_sword_fire_001"
 */
function getNextEntityId(entityType, category, name) {
    // Initialize counter for this category if needed
    if (!entityCounters[entityType][category]) {
        entityCounters[entityType][category] = 0;
    }
    
    // Increment counter
    entityCounters[entityType][category]++;
    const count = entityCounters[entityType][category];
    
    // Get prefix mapping based on entity type and category
    let prefix;
    if (entityType === 'item') {
        prefix = ITEM_CATEGORY_PREFIXES[category];
    } else if (entityType === 'npc') {
        prefix = NPC_CATEGORY_PREFIXES[category];
    } else if (entityType === 'location') {
        prefix = LOCATION_CATEGORY_PREFIXES[category];
    }
    
    // Sanitize name for use in ID (lowercase, replace spaces with underscores, remove special chars)
    const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')  // Remove special characters
        .trim()
        .replace(/\s+/g, '_');         // Replace spaces with underscores
    
    // Format: XXX_name_###
    const paddedCount = String(count).padStart(3, '0');
    return `${prefix}_${sanitizedName}_${paddedCount}`;
}

/**
 * Reset all entity counters (useful for testing or starting fresh)
 */
function resetCounters() {
    entityCounters.item = {};
    entityCounters.npc = {};
    entityCounters.location = {};
    console.log('✅ Entity counters reset');
}

/**
 * Get current counter values (for debugging)
 * @returns {Object} Current state of all counters
 */
function getCounterStats() {
    return {
        item: { ...entityCounters.item },
        npc: { ...entityCounters.npc },
        location: { ...entityCounters.location }
    };
}

/**
 * Log current counter stats to console
 */
function logCounterStats() {
    console.log('📊 Entity Counter Stats:', getCounterStats());
}

