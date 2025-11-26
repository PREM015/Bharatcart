export interface recommendation.strategyStrategy {
  execute(data: any): Promise<any>;
}

export class Defaultrecommendation.strategyStrategy implements recommendation.strategyStrategy {
  async execute(data: any) {
    // TODO: Implement strategy
    return data;
  }
}

export default new Defaultrecommendation.strategyStrategy();
