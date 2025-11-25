'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  user: {
    name: string
    avatar: string
    badge?: string
  }
  message: string
  timestamp: Date
  type?: 'message' | 'joined' | 'purchased'
}

export function LiveChat({ viewers, streamId }: { viewers: number; streamId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  function sendMessage() {
    if (!input.trim()) return
    
    const newMessage: Message = {
      id: Date.now().toString(),
      user: {
        name: 'You',
        avatar: '/images/default-avatar.jpg',
        badge: '⭐'
      },
      message: input,
      timestamp: new Date(),
      type: 'message'
    }
    
    setMessages(prev => [...prev, newMessage])
    setInput('')
  }
  
  const emojis = ['❤️', '🔥', '👏', '😂', '🎉', '😍', '👍', '💯']
  
  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          💬 Live Chat
          <span className="text-sm font-normal text-gray-500">
            ({viewers} online)
          </span>
        </h3>
        
        <div className="flex gap-2">
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <img 
                src={msg.user.avatar} 
                alt={msg.user.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{msg.user.name}</span>
                  {msg.user.badge && (
                    <span className="text-xs">{msg.user.badge}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                {msg.type === 'purchased' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
                    <span className="text-green-700">🎉 Just purchased: {msg.message}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">{msg.message}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Say something..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            maxLength={200}
          />
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            😊
          </button>
          
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="flex gap-2 flex-wrap">
            {emojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  setInput(prev => prev + emoji)
                  setShowEmojiPicker(false)
                }}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        {/* Quick Reactions */}
        <div className="flex gap-2 mt-2">
          {['❤️', '🔥', '👏', '😂', '🎉'].map(emoji => (
            <button
              key={emoji}
              className="flex-1 text-2xl hover:scale-110 transition-transform bg-gray-50 hover:bg-gray-100 rounded-lg py-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
