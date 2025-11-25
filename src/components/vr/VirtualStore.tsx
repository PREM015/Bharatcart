/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Box, RoundedBox, Plane } from '@react-three/drei'
import * as THREE from 'three'

interface Product {
  id: string
  name: string
  position: [number, number, number]
  color: string
  price: number
}

const products: Product[] = [
  { id: '1', name: 'iPhone 15 Pro', position: [-4, 1, 0], color: '#3b82f6', price: 134900 },
  { id: '2', name: 'MacBook Pro', position: [-2, 1, 0], color: '#10b981', price: 249900 },
  { id: '3', name: 'AirPods Pro', position: [0, 1, 0], color: '#f59e0b', price: 24900 },
  { id: '4', name: 'iPad Air', position: [2, 1, 0], color: '#ef4444', price: 59900 },
  { id: '5', name: 'Apple Watch', position: [4, 1, 0], color: '#8b5cf6', price: 41900 },
]

export function VirtualStore({ onProductSelect }: { onProductSelect: (name: string) => void }) {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)
  
  return (
    <group>
      {/* Floor */}
      <Plane 
        args={[30, 30]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#f0f0f0" />
      </Plane>
      
      {/* Store Walls */}
      <RoundedBox args={[30, 6, 0.2]} position={[0, 3, -8]} radius={0.05}>
        <meshStandardMaterial color="#e5e7eb" />
      </RoundedBox>
      
      {/* Ceiling */}
      <Plane args={[30, 30]} rotation={[Math.PI / 2, 0, 0]} position={[0, 6, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Plane>
      
      {/* Products Display */}
      {products.map((product) => (
        <ProductDisplay
          key={product.id}
          product={product}
          isHovered={hoveredProduct === product.id}
          onHover={() => setHoveredProduct(product.id)}
          onUnhover={() => setHoveredProduct(null)}
          onClick={() => onProductSelect(product.name)}
        />
      ))}
      
      {/* Store Sign */}
      <Text
        position={[0, 5, -7.9]}
        fontSize={0.8}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        BHARATCART STORE
      </Text>
    </group>
  )
}

function ProductDisplay({ product, isHovered, onHover, onUnhover, onClick }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && isHovered) {
      meshRef.current.rotation.y += 0.02
      meshRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
    } else if (meshRef.current) {
      meshRef.current.rotation.y = 0
      meshRef.current.position.y = 1
    }
  })
  
  return (
    <group position={product.position}>
      {/* Product Pedestal */}
      <Box args={[1.2, 0.1, 1.2]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#d1d5db" />
      </Box>
      
      {/* Product Box */}
      <RoundedBox
        ref={meshRef}
        args={[1, 1, 1]}
        radius={0.1}
        onPointerOver={onHover}
        onPointerOut={onUnhover}
        onClick={onClick}
        castShadow
      >
        <meshStandardMaterial 
          color={isHovered ? '#ffffff' : product.color}
          emissive={isHovered ? product.color : '#000000'}
          emissiveIntensity={isHovered ? 0.5 : 0}
          metalness={0.3}
          roughness={0.4}
        />
      </RoundedBox>
      
      {/* Product Label */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.2}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#ffffff"
      >
        {product.name}
      </Text>
      
      {/* Price Tag */}
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.15}
        color="#059669"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        ₹{(product.price / 1000).toFixed(1)}K
      </Text>
      
      {/* Hover Indicator */}
      {isHovered && (
        <Text
          position={[0, 2.2, 0]}
          fontSize={0.15}
          color="#ef4444"
          anchorX="center"
          anchorY="middle"
        >
          👆 Click to View
        </Text>
      )}
    </group>
  )
}
