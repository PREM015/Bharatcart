/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export class PersonalShopperAgent {
  async chat(message: string, context: any) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a luxury personal shopper.' },
        { role: 'user', content: message }
      ]
    })
    return response.choices[0].message.content
  }
}
