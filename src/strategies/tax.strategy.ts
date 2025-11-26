export interface tax.strategyStrategy {
  execute(data: any): Promise<any>;
}

export class Defaulttax.strategyStrategy implements tax.strategyStrategy {
  async execute(data: any) {
    // TODO: Implement strategy
    return data;
  }
}

export default new Defaulttax.strategyStrategy();
