# Game Configurator Dashboard

A real-time testing interface for the Game Configurator Orchestrator LLM system that generates complete game configurations using Gemini 2.5 Pro.

## Quick Start

### 1. Setup Environment

Make sure you have a `.env` file in the project root with your Gemini API key:

```bash
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 2. Start the Dashboard

```bash
npm run dev
```

Then navigate to: **http://localhost:5173/__tests__/game-configurator/dashboard.html**

This will:
- Start the main Vite dev server
- Serve the dashboard at the test path
- Enable hot module replacement for development

### 3. Generate a Game Configuration

1. **Enter Character Name**: e.g., "Marco Polo"
2. **Enter Game Description**: Detailed description of the character and gameplay
3. **Click "Generate Game Configuration"**
4. **Wait for completion**: This takes 5-10 minutes for full entity generation

## What the Dashboard Does

### Step 1: Configuration Generation
- Uses **Gemini 2.5 Pro** to analyze your input
- Generates a **500-800 word scratchpad** with game design details
- Creates **dynamic categories** appropriate for the genre
- Plans **essential entities** needed for the narrative

### Step 2: Entity Generation
- Generates **regions** with real historical names (Venice, Persian Empire, etc.)
- Creates **locations** with detailed descriptions and images
- Spawns **NPCs** with attributes and historical accuracy
- Produces **items** with appropriate categories and properties

### Step 3: Seed File Generation
- Creates TypeScript seed files ready for the main game
- Generates configuration JSON and scratchpad text
- All files are downloadable for integration

## Example Input

**Character**: Marco Polo
**Description**: 
```
Play as Marco Polo, the famous Venetian merchant and explorer. Travel from Venice to China in the 13th century, following the Silk Road through Persia and Central Asia to reach Kublai Khan's court in Xanadu. Experience historical exploration, trading, diplomacy, and cultural exchange in this immersive historical RPG.
```

## Expected Output

### Scratchpad (500-800 words)
- Game title and historical context
- Detailed narrative arc with 5-7 plot points
- Core gameplay mechanics (trading, diplomacy, exploration)
- What makes the game fun and engaging
- Historical accuracy notes

### Game Rules
- **Historical Period**: "1271-1295 CE - Late Medieval Period, Yuan Dynasty China"
- **Genre**: "historical exploration and trading RPG"
- **Art Style**: "13th century manuscript illumination style"
- **Categories**: Dynamic categories for items, NPCs, and locations

### Regions
- Venice (medieval Italian city-state)
- Persian Empire (Islamic golden age)
- Yuan Dynasty China (Mongol empire)

### Generated Entities
- 4-6 locations with real historical places
- 3-5 NPCs including Kublai Khan and historical figures
- 3-5 items including papal letter and trade goods
- All with appropriate categories and attributes

## Features

### Real-Time Progress
- Status messages during generation
- Console logging for debugging
- Progress indicators for long operations

### Download Options
- **Config JSON**: Complete configuration data
- **Scratchpad**: Text file with game design notes
- **Seed Files**: TypeScript files ready for integration

### Error Handling
- Clear error messages for API failures
- Validation for required fields
- Console logging for debugging

## Technical Details

### Architecture
- **Frontend**: HTML/CSS/TypeScript with Vite
- **Backend**: Direct API calls to Gemini 2.5 Pro
- **Entity Generation**: Uses existing generation services
- **File Generation**: Creates TypeScript seed files

### API Integration
- Uses `VITE_GEMINI_API_KEY` environment variable
- Calls `generateGameConfiguration()` for planning
- Calls `generateGameEntities()` for entity creation
- Calls `generateSeedFiles()` for file generation

### File Structure
```
__tests__/game-configurator/
├── dashboard.html          # Main UI
├── dashboard.ts           # UI logic with real API calls
├── styles.css            # Styling
├── test-orchestrator-simple.ts  # Simple test script
└── DASHBOARD-README.md   # This file
```

## Troubleshooting

### Common Issues

1. **"VITE_GEMINI_API_KEY not found"**
   - Check that `.env` file exists in project root
   - Verify the API key is correct
   - Restart the dashboard after adding the key

2. **"Generation failed"**
   - Check browser console for detailed error messages
   - Verify API key is valid and has quota
   - Check network connection

3. **"No entities generated"**
   - This is normal - entity generation takes 5-10 minutes
   - Check console for progress updates
   - Wait for completion before downloading

4. **Dashboard won't load**
   - Run `npm install` to ensure dependencies are installed
   - Check that Vite is installed: `npm list vite`
   - Make sure you're using the correct URL: `http://localhost:5173/__tests__/game-configurator/dashboard.html`

### Debug Mode

Open browser developer tools (F12) to see:
- Detailed console logs
- API request/response data
- Error stack traces
- Generation progress updates

## Development

### Making Changes

1. **Edit TypeScript**: Modify `dashboard.ts`
2. **Edit Styles**: Modify `styles.css`
3. **Edit HTML**: Modify `dashboard.html`
4. **Hot Reload**: Changes appear automatically

### Testing

Run the simple test:
```bash
npx tsx __tests__/game-configurator/test-orchestrator-simple.ts
```

### Building for Production

```bash
npm run build
```

This creates a `dist/` folder with the built application including the dashboard.

## Next Steps

After successful generation:

1. **Review the scratchpad** for game design quality
2. **Check categories** for genre appropriateness
3. **Verify regions** use real historical names
4. **Download seed files** for integration
5. **Test with different characters** and scenarios

The dashboard is now ready for real testing of the Game Configurator Orchestrator system!
