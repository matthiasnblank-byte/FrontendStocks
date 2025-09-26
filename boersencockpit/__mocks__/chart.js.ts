export const registerables: unknown[] = [];

export class Chart<TType = string, TData = unknown, TLabel = unknown> {
  static register(..._items: unknown[]): void {
    // noop for tests
  }
  constructor(_context: unknown, _config: unknown) {}
}
