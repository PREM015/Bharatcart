'use client'

import { useWebRTC } from '@/hooks/useWebRTC'
import { LiveProductCard } from './LiveProductCard'
import { LiveChat } from './LiveChat'
import { useState, useEffect } from 'react'

export function LiveShoppingStream({ streamId = 'default-stream' }: { streamId?: string }) {
  const { stream, viewers, products, isLive, reactions } = useWebRTC(streamId)
  const [isPinned, setIsPinned] = useState(false)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/host-avatar.jpg" 
              alt="Host"
              className="w-12 h-12 rounded-full border-2 border-white"
            />
            <div>
              <h1 className="text-white font-bold text-lg">Fashion Friday Live!</h1>
              <p className="text-white/70 text-sm">With @FashionGuru</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsPinned(!isPinned)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur"
          >
            {isPinned ? '📌 Pinned' : '📍 Pin Stream'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          {/* Live Video Stream */}
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
            <video 
              ref={stream}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video object-cover"
            />
            
            {/* Live Badge */}
            {isLive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full animate-pulse shadow-lg">
                <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
                <span className="font-bold text-sm">LIVE</span>
              </div>
            )}
            
            {/* Viewer Count */}
            <div className="absolute top-4 right-4 bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md">
              <span className="flex items-center gap-2">
                <span className="text-2xl">👁️</span>
                <span className="font-bold">{viewers.toLocaleString()}</span>
                <span className="text-sm text-white/80">watching</span>
              </span>
            </div>
            
            {/* Reactions Overlay */}
            <div className="absolute top-1/2 right-4 flex flex-col gap-2">
              {reactions.map((reaction, i) => (
                <div
                  key={i}
                  className="text-4xl animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {reaction}
                </div>
              ))}
            </div>
            
            {/* Product Carousel */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {products.map(product => (
                  <LiveProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
            
            {/* Stream Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full px-6 py-3 flex gap-4">
              <button className="text-white hover:text-red-400 transition">
                ❤️
              </button>
              <button className="text-white hover:text-yellow-400 transition">
                ⭐
              </button>
              <button className="text-white hover:text-blue-400 transition">
                🎁
              </button>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Featured Products */}
            <div className="bg-white rounded-2xl p-4 shadow-xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                🛍️ Shop the Stream
                <span className="text-sm font-normal text-gray-500">
                  ({products.length} items)
                </span>
              </h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {products.slice(0, 5).map(product => (
                  <div 
                    key={product.id} 
                    className="flex gap-3 items-center p-2 hover:bg-gray-50 rounded-lg transition cursor-pointer group"
                  >
                    <div className="relative">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      {product.stock < 5 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {product.stock} left
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-primary-600 font-bold">₹{product.price}</p>
                        {product.originalPrice && (
                          <p className="text-gray-400 text-sm line-through">
                            ₹{product.originalPrice}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-primary-700 opacity-0 group-hover:opacity-100 transition">
                      Buy
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Live Chat */}
            <LiveChat viewers={viewers} streamId={streamId} />
          </div>
        </div>
      </div>
    </div>
  )
}
