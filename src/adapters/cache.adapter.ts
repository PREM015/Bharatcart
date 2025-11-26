export interface cache.adapterAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(data: any): Promise<any>;
}

export class cache.adapterImplementation implements cache.adapterAdapter {
  async connect() {
    // TODO: Implement connection
  }

  async disconnect() {
    // TODO: Implement disconnection
  }

  async execute(data: any) {
    // TODO: Implement execution
    return data;
  }
}

export default new cache.adapterImplementation();
