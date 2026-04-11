import type { SourceConnector } from './types';

export class ConnectorRegistry {
  private connectors: SourceConnector[] = [];

  register(connector: SourceConnector): void {
    this.connectors.push(connector);
  }

  /** Find a connector that can handle this URL */
  resolve(url: string): SourceConnector | null {
    return this.connectors.find(c => c.canHandle(url)) ?? null;
  }

  /** Find a connector by type identifier */
  get(type: string): SourceConnector | null {
    return this.connectors.find(c => c.type === type) ?? null;
  }
}
