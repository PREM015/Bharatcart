export default class BaseRepository<T> {
  async findAll(): Promise<T[]> {
    // TODO: Implement
    return [];
  }

  async findById(id: string): Promise<T | null> {
    // TODO: Implement
    return null;
  }

  async create(data: Partial<T>): Promise<T> {
    // TODO: Implement
    return data as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    // TODO: Implement
    return data as T;
  }

  async delete(id: string): Promise<boolean> {
    // TODO: Implement
    return true;
  }
}
