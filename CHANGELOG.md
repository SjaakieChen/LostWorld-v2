# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-11

### Added
- **Chatbot Services**: New chatbot service system in `src/services/chatbots/`
  - `advisorLLM` service for narrative information and player questions
  - LLM registry system for centralized LLM configuration
  - Timeline integration for conversation history
  - Markdown support for chatbot responses
  - Typing animation for system messages in chat interface
  
- **Chat UI Enhancements**:
  - Fixed-size chat container with responsive height (22rem)
  - LLM indicator in chat header showing "Advisor LLM"
  - Letter-by-letter typing animation for system messages
  - Word wrapping and overflow handling for long messages

- **LLM Registry System**:
  - Centralized configuration for all LLMs
  - Dashboard panel displaying all LLMs and their timeline tag access
  - Support for multiple LLM services with different purposes

- **Timeline System Improvements**:
  - Refactored from string-based tags to array-based tags
  - Backward compatibility for old save files with string tags
  - Enhanced filtering by multiple tags
  - Support for tag-based LLM context access

### Changed
- **Renamed DefaultChatAreaLLM to advisorLLM**:
  - Service renamed from `DefaultChatAreaLLM` to `advisorLLM`
  - File renamed from `default-chat-area-llm.ts` to `advisor-llm.ts`
  - All references updated throughout codebase
  - Timeline tags updated from `['user', 'DefaultChatAreaLLM']` to `['user', 'advisorLLM']`
  - LLM registry entry updated (id: `'advisor-llm'`, name: `'Advisor LLM'`)

- **Folder Structure**:
  - Renamed `src/services/chatbot/` to `src/services/chatbots/`
  - Updated all import statements and documentation references

- **Entity Generation**:
  - Renamed `description` field to `visualDescription` for entities
  - Added `functionalDescription` field for game mechanics
  - Updated generation prompts to generate both descriptions
  - Updated entity modals to display both descriptions

- **Dashboard Layout**:
  - Reorganized scratchpad and timeline into full-width section
  - Each panel spans 50% of the section width
  - Added LLM panel to dashboard
  - Improved responsive layout for smaller screens

- **Modal Improvements**:
  - Increased modal size by 50% (width and height)
  - Set modal to 2:1 aspect ratio for proper image display
  - Image and text areas each maintain 1:1 aspect ratio
  - Updated both game and dev dashboard modals

### Fixed
- Chat area expansion issue - container now maintains fixed size
- Entity modal property access errors (using `own_attributes` instead of `properties`)
- Timeline tag filtering for chatbot services
- Save/load backward compatibility for timeline tag format

### Documentation
- Created `DATA-FLOW.md` with comprehensive data flow diagrams
- Updated `SERVICES.md` with chatbot service documentation
- Updated `IMPLEMENTING-FEATURES.md` with data flow considerations
- Updated `STATE-MANAGEMENT.md` with scratchpad and timeline persistence
- Added breaking change prevention guidelines
- Updated all documentation references from `DefaultChatAreaLLM` to `advisorLLM`
- Updated folder references from `chatbot` to `chatbots`

### Technical Details
- **Models Used**:
  - `gemini-2.5-pro`: Game orchestration and complex reasoning
  - `gemini-2.5-flash`: Chatbot responses (advisorLLM)
  - `gemini-2.5-flash-lite`: Fast JSON generation for entities
  - `gemini-2.5-flash-image`: Image generation (Nano Banana)

- **API Endpoints**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

- **Dependencies**: No new dependencies added (markdown parsing and typing animation implemented without external libraries)

