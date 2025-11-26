export interface inventory.strategyStrategy {
  execute(data: any): Promise<any>;
}

export class Defaultinventory.strategyStrategy implements inventory.strategyStrategy {
  async execute(data: any) {
    // TODO: Implement strategy
    return data;
  }
}

export default new Defaultinventory.strategyStrategy();
