'use client'

import { useState } from 'react'

export function QuestSystem() {
  const [quests] = useState([
    { id: '1', title: '🎯 First Purchase', progress: 0, target: 1, reward: 100 }
  ])
  
  return <div className="p-8">Quest System</div>
}
