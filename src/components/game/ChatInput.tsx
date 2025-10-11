import { useState, useEffect, useRef } from 'react'

interface Message {
  id: number
  type: 'player' | 'system'
  text: string
}

const ChatInput = () => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, type: 'system', text: 'You arrive at the ancient castle gates. What will you do?' },
    { id: 2, type: 'player', text: 'I approach the guard and ask about the castle.' },
    { id: 3, type: 'system', text: 'The guard eyes you suspiciously and asks for your business here.' },
    { id: 4, type: 'player', text: 'I tell him I\'m a traveler seeking shelter for the night.' },
    { id: 5, type: 'system', text: 'The guard considers your request and strokes his beard thoughtfully.' },
  ])
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat container to bottom when new messages appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        type: 'player',
        text: input
      }
      setMessages([...messages, newMessage])
      setInput('')
    }
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 flex flex-col h-64">
      <h3 className="text-sm font-semibold mb-2 text-gray-400">Chat History</h3>
      
      {/* Chat History Display */}
      <div 
        ref={chatContainerRef}
        className="flex-1 bg-gray-800 rounded p-3 mb-3 overflow-y-auto border border-gray-600"
      >
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`text-sm ${
                message.type === 'player' 
                  ? 'text-blue-300 font-semibold' 
                  : 'text-gray-300'
              }`}
            >
              <span className="text-gray-500 text-xs mr-2">
                {message.type === 'player' ? '▶' : '●'}
              </span>
              {message.text}
            </div>
          ))}
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatInput

