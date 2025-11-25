export interface UserPreferences {
  budget: number
  style: string[]
  bodyType?: string
}

export interface ShoppingContext {
  message: string
  image?: string
  userId: string
}
