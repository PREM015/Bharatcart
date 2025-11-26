export interface shipping.strategyStrategy {
  execute(data: any): Promise<any>;
}

export class Defaultshipping.strategyStrategy implements shipping.strategyStrategy {
  async execute(data: any) {
    // TODO: Implement strategy
    return data;
  }
}

export default new Defaultshipping.strategyStrategy();
