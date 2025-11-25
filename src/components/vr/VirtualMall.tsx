'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Sky, PerspectiveCamera } from '@react-three/drei'
import { VirtualStore } from './VirtualStore'
import { useState } from 'react'

export function VirtualMall() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  
  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
        <Sky sunPosition={[100, 20, 100]} />
        <Environment preset="city" />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />
        
        {/* Virtual Store */}
        <VirtualStore onProductSelect={setSelectedProduct} />
        
        {/* Camera Controls */}
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={5}
          maxDistance={20}
        />
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-4 rounded-lg shadow-xl">
        <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
          🎮 VR Shopping Mall
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Explore our virtual store in 3D
        </p>
        <div className="space-y-1 text-xs text-gray-500">
          <p>🖱️ Left Click + Drag: Rotate</p>
          <p>🖱️ Right Click + Drag: Pan</p>
          <p>🔍 Scroll: Zoom In/Out</p>
          <p>👆 Click Product: View Details</p>
        </div>
      </div>
      
      {/* Product Info Panel */}
      {selectedProduct && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-6 rounded-lg shadow-xl max-w-sm">
          <h3 className="font-bold text-xl mb-2">{selectedProduct}</h3>
          <p className="text-gray-600 mb-3">Click to view full details</p>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg w-full hover:bg-primary-700">
            View Product
          </button>
        </div>
      )}
      
      {/* Mini Map */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg">
        <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-xs text-gray-500">Mini Map</span>
        </div>
      </div>
    </div>
  )
}
