export interface discount.strategyStrategy {
  execute(data: any): Promise<any>;
}

export class Defaultdiscount.strategyStrategy implements discount.strategyStrategy {
  async execute(data: any) {
    // TODO: Implement strategy
    return data;
  }
}

export default new Defaultdiscount.strategyStrategy();
