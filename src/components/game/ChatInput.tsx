import { useState, useEffect, useRef } from 'react'
import { useGameState } from '../../context/GameStateContext'
import { usePlayerUI } from '../../context/PlayerUIContext'
import { useEntityStorage } from '../../context/EntityMemoryStorage'
import { advisorLLM, getLocalGameContext } from '../../services/chatbots'
import { TypingText } from '../common/TypingText'
import type { TimelineEntry } from '../../context/timeline'

interface Message {
  id: number
  type: 'player' | 'system'
  text: string
}

const ChatInput = () => {
  const { generatedData, updateTimeline } = useGameState()
  const { 
    currentTurn, 
    currentLocation, 
    currentRegion, 
    inventorySlots, 
    playerStats,
    playerStatus, 
    npcs, 
    interactableItems 
  } = usePlayerUI()
  const { getAllItemById } = useEntityStorage()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat container to bottom when new messages appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      const userMessage = input.trim()
      const userMessageId = messages.length + 1
      
      // Append user message to timeline before sending
      updateTimeline(['user', 'advisorLLM'], userMessage, currentTurn)
      
      // Add user message immediately to UI
      const newUserMessage: Message = {
        id: userMessageId,
        type: 'player',
        text: userMessage
      }
      setMessages(prev => [...prev, newUserMessage])
      setInput('')
      setIsLoading(true)

      try {
        // Get game config and timeline
        const gameConfig = generatedData.config
        const currentTimeline = gameConfig?.theTimeline || []
        
        // Manually create a TimelineEntry for the user message since state updates are async
        // This ensures the LLM has the full dialogue context including the current user message
        const userTimelineEntry: TimelineEntry = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tags: ['user', 'advisorLLM'],
          text: userMessage,
          timestamp: Date.now(),
          turn: currentTurn
        }
        const timelineWithUserMessage = [...currentTimeline, userTimelineEntry]

        // Build local game context
        const localContext = getLocalGameContext(
          currentLocation,
          currentRegion,
          inventorySlots,
          playerStats,
          playerStatus,
          npcs,
          interactableItems,
          getAllItemById
        )

        // Generate response using advisorLLM
        const response = await advisorLLM.generateChatResponse(
          userMessage,
          gameConfig,
          timelineWithUserMessage,
          undefined, // Use default timeline tags
          localContext
        )

        // Add system response
        const systemMessage: Message = {
          id: userMessageId + 1,
          type: 'system',
          text: response
        }
        setMessages(prev => [...prev, systemMessage])

        // Append complete bot response to timeline after response is received
        updateTimeline(['chatbot', 'advisorLLM'], response, currentTurn)
      } catch (error: any) {
        console.error('Error generating chat response:', error)
        // Add error message
        const errorMessage: Message = {
          id: userMessageId + 1,
          type: 'system',
          text: `Sorry, I encountered an error: ${error.message || 'Unknown error'}`
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div 
      className="bg-gray-700 rounded-lg p-4 border border-gray-600 flex flex-col flex-shrink-0 flex-grow-0 h-80"
      style={{ maxHeight: '22rem', minHeight: '22rem' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-400">Chat History</h3>
        <span className="text-xs text-gray-500">Advisor LLM</span>
      </div>
      
      {/* Chat History Display */}
      <div 
        ref={chatContainerRef}
        className="flex-1 bg-gray-800 rounded p-3 mb-3 overflow-y-auto overflow-x-hidden border border-gray-600"
        style={{ maxHeight: '100%', minHeight: 0 }}
      >
        <div className="space-y-2" style={{ width: '100%', maxWidth: '100%', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No messages yet. Ask me anything about the game world!</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`text-sm ${
                  message.type === 'player' 
                    ? 'text-blue-300 font-semibold' 
                    : 'text-gray-300'
                }`}
                style={{ wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}
              >
                <span className="text-gray-500 text-xs mr-2">
                  {message.type === 'player' ? '▶' : '●'}
                </span>
                {message.type === 'system' ? (
                  <TypingText text={message.text}/>
                ) : (
                  message.text
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-sm text-gray-400 italic">
              <span className="text-gray-500 text-xs mr-2">●</span>
              Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your action here..."
          className="flex-1 bg-gray-800 text-gray-100 rounded px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-semibold transition-colors"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default ChatInput

