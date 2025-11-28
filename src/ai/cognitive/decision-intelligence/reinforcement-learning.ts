/**
 * Reinforcement Learning
 * Purpose: Learn optimal decisions through trial and error
 * Use Cases:
 * - Dynamic pricing
 * - Recommendation optimization
 * - Inventory management
 * - Marketing campaign optimization
 */

import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export interface State {
  features: Record<string, number>;
  hash: string;
}

export interface Action {
  id: string;
  params: Record<string, any>;
}

export interface Experience {
  state: State;
  action: Action;
  reward: number;
  nextState: State;
}

export class ReinforcementLearningAgent {
  private qTable: Map<string, Map<string, number>> = new Map();
  private learningRate = 0.1;
  private discountFactor = 0.95;
  private epsilon = 0.1; // Exploration rate

  constructor() {
    this.loadQTable();
  }

  /**
   * Choose action using epsilon-greedy policy
   */
  chooseAction(state: State, possibleActions: Action[]): Action {
    // Exploration: random action
    if (Math.random() < this.epsilon) {
      return possibleActions[Math.floor(Math.random() * possibleActions.length)];
    }

    // Exploitation: best known action
    const stateHash = state.hash;
    const actionValues = this.qTable.get(stateHash) || new Map();

    let bestAction = possibleActions[0];
    let bestValue = actionValues.get(bestAction.id) || 0;

    for (const action of possibleActions) {
      const value = actionValues.get(action.id) || 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Update Q-value based on experience
   */
  learn(experience: Experience): void {
    const { state, action, reward, nextState } = experience;

    // Get current Q-value
    const stateHash = state.hash;
    if (!this.qTable.has(stateHash)) {
      this.qTable.set(stateHash, new Map());
    }

    const actionValues = this.qTable.get(stateHash)!;
    const currentQ = actionValues.get(action.id) || 0;

    // Get max Q-value for next state
    const nextStateHash = nextState.hash;
    const nextActionValues = this.qTable.get(nextStateHash);
    const maxNextQ = nextActionValues
      ? Math.max(...Array.from(nextActionValues.values()))
      : 0;

    // Q-learning update rule
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);

    actionValues.set(action.id, newQ);

    logger.info('Updated Q-value', {
      state: stateHash,
      action: action.id,
      oldQ: currentQ,
      newQ,
      reward,
    });

    this.saveQTable();
  }

  /**
   * Get expected value of state
   */
  getStateValue(state: State): number {
    const stateHash = state.hash;
    const actionValues = this.qTable.get(stateHash);

    if (!actionValues || actionValues.size === 0) {
      return 0;
    }

    return Math.max(...Array.from(actionValues.values()));
  }

  /**
   * Save Q-table to Redis
   */
  private async saveQTable(): Promise<void> {
    const data = Array.from(this.qTable.entries()).map(([state, actions]) => ({
      state,
      actions: Array.from(actions.entries()),
    }));

    await redis.set('rl:qtable', JSON.stringify(data));
  }

  /**
   * Load Q-table from Redis
   */
  private async loadQTable(): Promise<void> {
    const data = await redis.get('rl:qtable');

    if (data) {
      const parsed = JSON.parse(data);
      this.qTable = new Map(
        parsed.map((item: any) => [item.state, new Map(item.actions)])
      );
      logger.info('Loaded Q-table', { states: this.qTable.size });
    }
  }
}

export default ReinforcementLearningAgent;
