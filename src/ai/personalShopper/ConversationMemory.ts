/* eslint-disable @typescript-eslint/no-explicit-any */
export class ConversationMemory {
  private memory = new Map<string, any[]>()
  
  add(userId: string, message: any) {
    const history = this.memory.get(userId) || []
    history.push(message)
    this.memory.set(userId, history.slice(-10))
  }
  
  get(userId: string) {
    return this.memory.get(userId) || []
  }
}
