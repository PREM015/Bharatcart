// File: src/app/(shop)/brands/[slug]/page.tsx
import React from 'react'
import type { ReactNode } from 'react'

/**
 * PageProps for Next.js dynamic routes
 * In Next.js 15, params is now a Promise
 */
export interface PageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export interface LayoutProps {
  children?: ReactNode
  params: Promise<{ slug: string }>
}

// ============================
// Example Page component
// ============================
const BrandPage = async ({ params }: PageProps) => {
  const { slug } = await params
  
  return (
    <div>
      <h1>Brand: {slug}</h1>
      <p>This is the brand page for {slug}.</p>
    </div>
  )
}

export default BrandPage

// Example layout component (optional)
export const BrandLayout = async ({ children, params }: LayoutProps) => {
  const { slug } = await params
  
  return (
    <div>
      <h2>Brand Layout for {slug}</h2>
      {children}
    </div>
  )
}