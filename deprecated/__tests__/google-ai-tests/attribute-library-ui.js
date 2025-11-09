// Attribute Library UI Management with localStorage Persistence

// ============================================================================
// LOCAL STORAGE FUNCTIONS
// ============================================================================

/**
 * Save attribute library to localStorage
 */
function saveAttributeLibraryToStorage(entityType, gameRules) {
    const key = `attributeLibrary_${entityType}`;
    localStorage.setItem(key, JSON.stringify(gameRules));
    console.log(`💾 Saved ${entityType} attribute library to localStorage`);
}

/**
 * Load attribute library from localStorage
 */
function loadAttributeLibraryFromStorage(entityType) {
    const key = `attributeLibrary_${entityType}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
        try {
            const gameRules = JSON.parse(stored);
            console.log(`📂 Loaded ${entityType} attribute library from localStorage`);
            return gameRules;
        } catch (error) {
            console.error('Failed to parse stored attribute library:', error);
            return null;
        }
    }
    return null;
}

/**
 * Clear localStorage for a specific entity type
 */
function clearAttributeLibraryStorage(entityType) {
    const key = `attributeLibrary_${entityType}`;
    localStorage.removeItem(key);
    console.log(`🗑️ Cleared ${entityType} attribute library from localStorage`);
    
    // Reset gameRules textarea to default
    const defaultGameRules = getDefaultGameRules();
    const gameRulesTextarea = document.getElementById(`${entityType}GameRules`);
    if (gameRulesTextarea) {
        gameRulesTextarea.value = JSON.stringify(defaultGameRules, null, 2);
    }
    
    console.log(`✅ ${entityType.toUpperCase()} attribute library reset to defaults`);
}

// Note: Game settings are now managed directly in the gameRules JSON textarea
// No separate UI inputs needed

/**
 * Get default gameRules structure
 */
function getDefaultGameRules() {
    return {
        artStyle: "historical illustration",
        genre: "exploration",
        historicalPeriod: "Medieval Europe 1200s",
        categories: {
            common: {
                attributes: {}
            }
        }
    };
}

// ============================================================================
// ATTRIBUTE MERGING
// ============================================================================

/**
 * Merge new attributes into existing library and save
 */
function mergeNewAttributesIntoLibrary(entityType, newAttributes) {
    if (!newAttributes || Object.keys(newAttributes).length === 0) {
        return;
    }
    
    // Get current gameRules
    const gameRulesTextarea = document.getElementById(`${entityType}GameRules`);
    let gameRules;
    
    try {
        gameRules = JSON.parse(gameRulesTextarea.value);
    } catch (error) {
        console.error('Failed to parse gameRules');
        gameRules = getDefaultGameRules();
    }
    
    // Merge new attributes into categories
    let attributesAdded = 0;
    
    for (const [attrName, attrData] of Object.entries(newAttributes)) {
        const category = attrData.category || 'common';
        
        // Ensure category exists
        if (!gameRules.categories) gameRules.categories = {};
        if (!gameRules.categories[category]) {
            gameRules.categories[category] = { attributes: {} };
        }
        if (!gameRules.categories[category].attributes) {
            gameRules.categories[category].attributes = {};
        }
        
        // Check if attribute already exists
        if (gameRules.categories[category].attributes[attrName]) {
            console.log(`⚠️ Attribute "${attrName}" already exists in ${category}, skipping`);
            continue;
        }
        
        // Add the new attribute (without the 'value' and 'category' fields)
        const { value, category: cat, ...metadata } = attrData;
        gameRules.categories[category].attributes[attrName] = metadata;
        
        console.log(`✨ Added new attribute "${attrName}" to ${category} category:`, metadata);
        attributesAdded++;
    }
    
    // Update UI and save
    gameRulesTextarea.value = JSON.stringify(gameRules, null, 2);
    saveAttributeLibraryToStorage(entityType, gameRules);
    
    if (attributesAdded > 0) {
        console.log(`✅ ${attributesAdded} new attribute(s) added to ${entityType} library`);
    }
    
    return attributesAdded;
}

// ============================================================================
// PAGE LOAD INITIALIZATION
// ============================================================================

/**
 * On page load, restore from localStorage
 */
window.addEventListener('DOMContentLoaded', () => {
    console.log('📚 Initializing Attribute Library...');
    
    ['item', 'npc', 'location'].forEach(entityType => {
        const stored = loadAttributeLibraryFromStorage(entityType);
        
        if (stored) {
            // Restore gameRules textarea from localStorage
            const gameRulesTextarea = document.getElementById(`${entityType}GameRules`);
            if (gameRulesTextarea) {
                gameRulesTextarea.value = JSON.stringify(stored, null, 2);
            }
            
            console.log(`✅ Restored ${entityType} library from localStorage`);
        } else {
            console.log(`ℹ️ No stored ${entityType} library found, using defaults`);
        }
    });
});

