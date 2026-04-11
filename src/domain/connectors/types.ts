export interface FetchResult {
  title: string;
  content: string;
  summary?: string;
  /** Suggested folder for grouping (e.g., "owner-repo"). Connector-derived, user can override. */
  suggestedFolder?: string;
}

/** An entry in a repository file tree. */
export interface TreeEntry {
  path: string;
  size: number;
  /** Full URL to the file on github.com (blob view) */
  url: string;
}

export interface SourceConnector {
  /** Unique type identifier matching SOURCE_TYPES values */
  readonly type: string;
  /** Human-readable name */
  readonly displayName: string;
  /** Returns true if this connector can handle the given URL */
  canHandle(url: string): boolean;
  /** Fetch content from the URL. Throws on failure. */
  fetch(url: string): Promise<FetchResult>;
  /** List files in a repository. Only supported by connectors that expose browsing. */
  listTree?(repoUrl: string): Promise<TreeEntry[]>;
}
