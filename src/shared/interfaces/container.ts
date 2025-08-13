export interface Container {
  register<T>(token: string, factory: () => T): void;
  resolve<T>(token: string): T;
}

export class DIContainer implements Container {
  private dependencies = new Map<string, () => any>();
  private instances = new Map<string, any>();

  register<T>(token: string, factory: () => T): void {
    this.dependencies.set(token, factory);
  }

  resolve<T>(token: string): T {
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    const factory = this.dependencies.get(token);
    if (!factory) {
      throw new Error(`Dependency ${token} not found`);
    }

    const instance = factory();
    this.instances.set(token, instance);
    return instance;
  }

  registerSingleton<T>(token: string, factory: () => T): void {
    this.register(token, () => {
      if (this.instances.has(token)) {
        return this.instances.get(token);
      }
      const instance = factory();
      this.instances.set(token, instance);
      return instance;
    });
  }
}