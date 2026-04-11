import type { SourceConnector, FetchResult, TreeEntry } from './types';

const CONTENT_LIMIT = 50_000;

const GITHUB_BLOB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/;
const GITHUB_RAW_RE = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
const GITHUB_REPO_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
const GITHUB_TREE_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?/;

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}

export interface ParsedGitHubRepoUrl {
  owner: string;
  repo: string;
  ref?: string;
  subtree?: string;
}

export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  let m = url.match(GITHUB_BLOB_RE);
  if (m) return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };

  m = url.match(GITHUB_RAW_RE);
  if (m) return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };

  m = url.match(GITHUB_REPO_RE);
  if (m) return { owner: m[1], repo: m[2], ref: 'HEAD', path: 'README.md' };

  return null;
}

export function toRawUrl(parsed: ParsedGitHubUrl): string {
  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.ref}/${parsed.path}`;
}

export function deriveTitle(parsed: ParsedGitHubUrl): string {
  const filename = parsed.path.split('/').pop() ?? parsed.path;
  return `${parsed.owner}/${parsed.repo} — ${filename}`;
}

/**
 * Parse a GitHub repo or tree URL into owner/repo and optional ref/subtree.
 * Accepts:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo/tree/branch
 *   - https://github.com/owner/repo/tree/branch/subdir
 */
export function parseGitHubRepoUrl(url: string): ParsedGitHubRepoUrl | null {
  let m = url.match(GITHUB_TREE_RE);
  if (m) return { owner: m[1], repo: m[2], ref: m[3], subtree: m[4] };

  m = url.match(GITHUB_REPO_RE);
  if (m) return { owner: m[1], repo: m[2] };

  return null;
}

export class GitHubConnector implements SourceConnector {
  readonly type = 'github';
  readonly displayName = 'GitHub';

  canHandle(url: string): boolean {
    return parseGitHubUrl(url) !== null;
  }

  async fetch(url: string): Promise<FetchResult> {
    const parsed = parseGitHubUrl(url);
    if (!parsed) throw new Error(`Cannot parse GitHub URL: ${url}`);

    const rawUrl = toRawUrl(parsed);
    const res = await fetch(rawUrl);
    if (!res.ok) {
      throw new Error(`GitHub fetch failed (${res.status}): ${rawUrl}`);
    }

    let content = await res.text();
    if (content.length > CONTENT_LIMIT) {
      content = content.slice(0, CONTENT_LIMIT) + '\n\n---\n*Content truncated at 50,000 characters.*';
    }

    return {
      title: deriveTitle(parsed),
      content,
    };
  }

  /**
   * List all files in a GitHub repo (or subtree).
   * Uses the GitHub Git Trees API with recursive=1.
   */
  async listTree(repoUrl: string): Promise<TreeEntry[]> {
    const parsed = parseGitHubRepoUrl(repoUrl);
    if (!parsed) throw new Error(`Cannot parse GitHub repo URL: ${repoUrl}`);

    // Resolve the ref (default branch) if not specified
    const ref = parsed.ref ?? await this.getDefaultBranch(parsed.owner, parsed.repo);

    const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${ref}?recursive=1`;
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'tab-for-projects' },
    });
    if (!res.ok) {
      throw new Error(`GitHub Trees API failed (${res.status}): ${apiUrl}`);
    }

    const data = await res.json() as { tree: { path: string; type: string; size?: number }[] };

    // Filter to blobs (files), optionally scoped to subtree
    let files = data.tree.filter(e => e.type === 'blob');
    if (parsed.subtree) {
      const prefix = parsed.subtree.endsWith('/') ? parsed.subtree : parsed.subtree + '/';
      files = files.filter(e => e.path.startsWith(prefix));
    }

    return files.map(e => ({
      path: e.path,
      size: e.size ?? 0,
      url: `https://github.com/${parsed.owner}/${parsed.repo}/blob/${ref}/${e.path}`,
    }));
  }

  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'tab-for-projects' },
    });
    if (!res.ok) {
      throw new Error(`GitHub API failed (${res.status}) looking up ${owner}/${repo}`);
    }
    const data = await res.json() as { default_branch: string };
    return data.default_branch;
  }
}
