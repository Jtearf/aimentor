import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { streamChatMessage, getUserCredits } from '../utils/api'
import PaywallModal from '../components/PaywallModal'
import ShareButton from '../components/ShareButton'

// Extend Error type to include API-specific properties
interface ApiError extends Error {
  isPaymentRequired?: boolean;
  status?: number;
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Persona {
  id: string
  name: string
  title: string
  description: string
  image_url: string
  expertise: string[]
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined)
  const [credits, setCredits] = useState<number>(5) // Default to 5 until we load real value
  const [showPaywall, setShowPaywall] = useState(false)
  const { user } = useAuth()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  
  // Load selected persona from localStorage
  useEffect(() => {
    const personaJson = localStorage.getItem('selectedPersona')
    
    if (!personaJson) {
      // If no persona is selected, redirect to persona selection page
      navigate('/app/personas')
      return
    }
    
    try {
      const persona = JSON.parse(personaJson)
      setSelectedPersona(persona)
      
      // Add initial welcome message
      setMessages([
        {
          id: '0',
          role: 'assistant',
          content: `Hello! I'm ${persona.name}. It's great to meet you! How can I help you today with your business or entrepreneurial journey?`,
          created_at: new Date().toISOString()
        }
      ])

      // Check if there's a saved conversation ID for this persona
      const savedConversationId = localStorage.getItem(`conversation_${persona.id}`)
      if (savedConversationId) {
        setCurrentConversationId(savedConversationId)
      }
    } catch (error) {
      console.error('Error parsing persona data:', error)
      navigate('/app/personas')
    }
  }, [navigate])

  // Load user credits
  useEffect(() => {
    if (user) {
      const loadCredits = async () => {
        try {
          const userCredits = await getUserCredits()
          setCredits(userCredits)
        } catch (error) {
          console.error('Error loading credits:', error)
          // Fallback to default if we can't load
        }
      }
      
      loadCredits()
    }
  }, [user])
  
  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Check if user has free messages left or is on premium plan
  const checkMessageAllowance = () => {
    // If credits are 0 or negative, show paywall
    if (credits <= 0) {
      setShowPaywall(true)
      return false
    }
    
    // If credits are low (1-2), show paywall but allow message
    if (credits <= 2) {
      // We'll show the paywall after the message is sent
      setTimeout(() => setShowPaywall(true), 2000)
    }
    
    return true
  }
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || isLoading || !selectedPersona) return
    
    // Check if user can send message
    if (!checkMessageAllowance()) {
      return
    }
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString()
    }
    
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsTyping(true)
    
    // Create placeholder for assistant response
    const assistantMessageId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, assistantMessage])
    
    try {
      // Stream the chat message to the backend API
      await streamChatMessage(
        inputValue,
        selectedPersona.id,
        currentConversationId,
        // Handle chunks as they arrive
        (chunk) => {
          setMessages(prev => {
            const updatedMessages = [...prev]
            const assistantMsgIndex = updatedMessages.findIndex(msg => msg.id === assistantMessageId)
            
            if (assistantMsgIndex !== -1) {
              updatedMessages[assistantMsgIndex] = {
                ...updatedMessages[assistantMsgIndex],
                content: updatedMessages[assistantMsgIndex].content + chunk
              }
            }
            
            return updatedMessages
          })
        },
        // Handle completion
        () => {
          setIsTyping(false)
          setIsLoading(false)
          
          // Update credits after message
          getUserCredits().then(setCredits).catch(console.error)
        },
        // Handle error
        (error: Error) => {
          const apiError = error as ApiError
          if (apiError.isPaymentRequired) {
            toast.error('You have run out of credits. Please upgrade your plan.')
            navigate('/app/subscriptions')
          } else {
            toast.error('Failed to get response. Please try again.')
          }
          setIsTyping(false)
          setIsLoading(false)
        }
      )
      
      // Store the conversation ID if it's new
      if (selectedPersona && currentConversationId) {
        localStorage.setItem(`conversation_${selectedPersona.id}`, currentConversationId)
      }
      
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error('Failed to get response. Please try again.')
      
      // Remove the empty assistant message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
      
      setIsTyping(false)
      setIsLoading(false)
    }
  }
  
  // Close paywall modal
  const handleClosePaywall = () => {
    setShowPaywall(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-screen">
      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={handleClosePaywall} 
        remainingMessages={credits}
      />
      
      {/* Chat header */}
      <div className="border-b dark:border-gray-700 p-3 sm:p-4 flex items-center">
        {selectedPersona && (
          <>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden mr-2 sm:mr-3">
              <img 
                src={selectedPersona.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPersona.name)}&background=random`} 
                alt={selectedPersona.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="truncate">
              <h2 className="font-medium text-base sm:text-lg truncate">{selectedPersona.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{selectedPersona.title}</p>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center space-x-1 sm:space-x-2">
          {/* Share button */}
          {messages.length > 1 && (
            <ShareButton 
              elementId="chat-messages-container"
              fileName={`chat-with-${selectedPersona?.name.toLowerCase().replace(' ', '-')}.png`}
              title={`My Chat with ${selectedPersona?.name}`}
              text={`Check out my conversation with ${selectedPersona?.name} on Billionaire Chat!`}
            />
          )}
          <button 
            onClick={() => navigate('/app/personas')}
            className="text-xs text-primary-600 hover:text-primary-500 px-2 py-1 sm:px-3 rounded-md hover:bg-primary-50 dark:hover:bg-gray-700"
          >
            Change Mentor
          </button>
        </div>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
        <div id="chat-messages-container" className="max-w-3xl mx-auto pb-2">
          {messages.map((message) => (
            <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'ml-auto' : 'mr-auto'} ${message.role === 'user' ? 'max-w-[80%] sm:max-w-[70%]' : 'max-w-[90%] sm:max-w-[75%]'}`}>
              <div className={`p-3 sm:p-4 rounded-xl ${
                message.role === 'user' 
                  ? 'bg-primary-600 text-white message-user' 
                  : 'bg-white dark:bg-gray-800 shadow-sm message-assistant'
              }`}>
                <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
              </div>
              <div className={`text-xs mt-1 text-gray-500 ${message.role === 'user' ? 'text-right' : ''}`}>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="mb-4 mr-auto max-w-[90%] sm:max-w-[75%]">
              <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm inline-flex typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input form */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg shadow-sm">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="input flex-1 text-sm sm:text-base py-2 px-3 sm:px-4"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="btn btn-primary px-3 sm:px-4 text-sm sm:text-base whitespace-nowrap"
            >
              Send
            </button>
          </form>
          
          {/* Credits counter */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right flex justify-between items-center sm:justify-end sm:space-x-1">
            <span>{credits} credits remaining</span> 
            <span className="hidden sm:inline">•</span>
            <span className="text-primary-600 hover:underline cursor-pointer" onClick={() => navigate('/app/subscriptions')}>Upgrade</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
