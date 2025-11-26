export interface pricing.strategyStrategy {
  execute(data: any): Promise<any>;
}

export class Defaultpricing.strategyStrategy implements pricing.strategyStrategy {
  async execute(data: any) {
    // TODO: Implement strategy
    return data;
  }
}

export default new Defaultpricing.strategyStrategy();
