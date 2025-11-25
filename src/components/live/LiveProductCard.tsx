'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface LiveProductCardProps {
  product: {
    id: string
    name: string
    price: number
    originalPrice?: number
    image: string
    stock: number
    discount?: number
  }
}

export function LiveProductCard({ product }: LiveProductCardProps) {
  const [added, setAdded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  
  async function handleQuickBuy() {
    setAdded(true)
    
    // Simulate add to cart
    setTimeout(() => {
      setAdded(false)
    }, 2000)
  }
  
  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 w-64 bg-white rounded-xl shadow-lg overflow-hidden group cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Product Image */}
      <div className="relative">
        <img 
          src={product.image}
          alt={product.name}
          className="w-full h-40 object-cover group-hover:scale-110 transition duration-300"
        />
        
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {discountPercent}% OFF
          </div>
        )}
        
        {/* Stock Warning */}
        {product.stock < 5 && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            Only {product.stock} left!
          </div>
        )}
        
        {/* Quick View Overlay */}
        {showTooltip && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
              Quick View
            </button>
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm mb-1 line-clamp-2 h-10">
          {product.name}
        </h4>
        
        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-primary-600">
            ₹{product.price.toLocaleString()}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              ₹{product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
        
        {/* Stock Indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(product.stock / 10) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{product.stock} in stock</span>
        </div>
        
        {/* Action Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleQuickBuy}
          disabled={added}
          className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
            added 
              ? 'bg-green-500 text-white' 
              : 'bg-gradient-to-r from-primary-600 to-purple-600 text-white hover:shadow-lg'
          }`}
        >
          {added ? (
            <span className="flex items-center justify-center gap-2">
              <span>✓</span>
              <span>Added to Cart!</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>⚡</span>
              <span>Quick Buy</span>
            </span>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
