/* eslint-disable @typescript-eslint/no-explicit-any */
export class RewardEngine {
  calculateReward(action: string) {
    const rewards: any = {
      'first_purchase': 100,
      'review': 50,
      'referral': 200
    }
    return rewards[action] || 0
  }
}
