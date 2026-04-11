import { describe, it, expect } from 'bun:test';
import { parseGitHubUrl, parseGitHubRepoUrl, toRawUrl, deriveTitle, deriveSuggestedFolder, GitHubConnector } from './github';
import { ConnectorRegistry } from './registry';

describe('parseGitHubUrl', () => {
  it('parses blob URLs', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react/blob/main/README.md');
    expect(result).toEqual({ owner: 'facebook', repo: 'react', ref: 'main', path: 'README.md' });
  });

  it('parses blob URLs with nested paths', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/blob/develop/src/lib/utils.ts');
    expect(result).toEqual({ owner: 'owner', repo: 'repo', ref: 'develop', path: 'src/lib/utils.ts' });
  });

  it('parses raw.githubusercontent.com URLs', () => {
    const result = parseGitHubUrl('https://raw.githubusercontent.com/facebook/react/main/README.md');
    expect(result).toEqual({ owner: 'facebook', repo: 'react', ref: 'main', path: 'README.md' });
  });

  it('parses repo root URLs (defaults to README.md)', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react');
    expect(result).toEqual({ owner: 'facebook', repo: 'react', ref: 'HEAD', path: 'README.md' });
  });

  it('parses repo root URLs with trailing slash', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react/');
    expect(result).toEqual({ owner: 'facebook', repo: 'react', ref: 'HEAD', path: 'README.md' });
  });

  it('returns null for non-GitHub URLs', () => {
    expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
    expect(parseGitHubUrl('https://example.com')).toBeNull();
    expect(parseGitHubUrl('not a url')).toBeNull();
  });

  it('returns null for unsupported GitHub paths', () => {
    expect(parseGitHubUrl('https://github.com/facebook/react/issues/123')).toBeNull();
    expect(parseGitHubUrl('https://github.com/facebook/react/pulls')).toBeNull();
  });
});

describe('toRawUrl', () => {
  it('converts parsed URL to raw.githubusercontent.com', () => {
    const url = toRawUrl({ owner: 'facebook', repo: 'react', ref: 'main', path: 'README.md' });
    expect(url).toBe('https://raw.githubusercontent.com/facebook/react/main/README.md');
  });

  it('handles nested paths', () => {
    const url = toRawUrl({ owner: 'o', repo: 'r', ref: 'v1', path: 'docs/guide.md' });
    expect(url).toBe('https://raw.githubusercontent.com/o/r/v1/docs/guide.md');
  });
});

describe('deriveTitle', () => {
  it('uses owner/repo and filename', () => {
    expect(deriveTitle({ owner: 'facebook', repo: 'react', ref: 'main', path: 'README.md' }))
      .toBe('facebook/react — README.md');
  });

  it('extracts filename from nested path', () => {
    expect(deriveTitle({ owner: 'o', repo: 'r', ref: 'main', path: 'docs/api/guide.md' }))
      .toBe('o/r — guide.md');
  });
});

describe('deriveSuggestedFolder', () => {
  it('returns repo prefix for root files', () => {
    expect(deriveSuggestedFolder({ owner: 'facebook', repo: 'react', ref: 'main', path: 'README.md' }))
      .toBe('facebook-react');
  });

  it('includes directory path for nested files', () => {
    expect(deriveSuggestedFolder({ owner: 'facebook', repo: 'react', ref: 'main', path: 'src/components/Button.tsx' }))
      .toBe('facebook-react/src/components');
  });

  it('handles single-level nesting', () => {
    expect(deriveSuggestedFolder({ owner: 'o', repo: 'r', ref: 'main', path: 'docs/guide.md' }))
      .toBe('o-r/docs');
  });

  it('lowercases everything', () => {
    expect(deriveSuggestedFolder({ owner: 'Facebook', repo: 'React', ref: 'main', path: 'Src/Utils.ts' }))
      .toBe('facebook-react/src');
  });
});

describe('parseGitHubRepoUrl', () => {
  it('parses repo root URLs', () => {
    expect(parseGitHubRepoUrl('https://github.com/facebook/react')).toEqual({ owner: 'facebook', repo: 'react' });
  });

  it('parses repo root URLs with trailing slash', () => {
    expect(parseGitHubRepoUrl('https://github.com/facebook/react/')).toEqual({ owner: 'facebook', repo: 'react' });
  });

  it('parses tree URLs with branch', () => {
    expect(parseGitHubRepoUrl('https://github.com/facebook/react/tree/main')).toEqual({ owner: 'facebook', repo: 'react', ref: 'main', subtree: undefined });
  });

  it('parses tree URLs with branch and subdirectory', () => {
    expect(parseGitHubRepoUrl('https://github.com/facebook/react/tree/main/packages/react')).toEqual({ owner: 'facebook', repo: 'react', ref: 'main', subtree: 'packages/react' });
  });

  it('returns null for non-repo URLs', () => {
    expect(parseGitHubRepoUrl('https://gitlab.com/owner/repo')).toBeNull();
    expect(parseGitHubRepoUrl('https://github.com/facebook/react/blob/main/README.md')).toBeNull();
  });
});

describe('GitHubConnector', () => {
  const connector = new GitHubConnector();

  it('has correct type and displayName', () => {
    expect(connector.type).toBe('github');
    expect(connector.displayName).toBe('GitHub');
  });

  it('canHandle returns true for valid GitHub URLs', () => {
    expect(connector.canHandle('https://github.com/facebook/react/blob/main/README.md')).toBe(true);
    expect(connector.canHandle('https://raw.githubusercontent.com/facebook/react/main/README.md')).toBe(true);
    expect(connector.canHandle('https://github.com/facebook/react')).toBe(true);
  });

  it('canHandle returns false for non-GitHub URLs', () => {
    expect(connector.canHandle('https://gitlab.com/owner/repo')).toBe(false);
    expect(connector.canHandle('https://example.com')).toBe(false);
  });
});

describe('ConnectorRegistry', () => {
  it('resolves URL to correct connector', () => {
    const registry = new ConnectorRegistry();
    const connector = new GitHubConnector();
    registry.register(connector);

    expect(registry.resolve('https://github.com/facebook/react/blob/main/README.md')).toBe(connector);
    expect(registry.resolve('https://example.com')).toBeNull();
  });

  it('gets connector by type', () => {
    const registry = new ConnectorRegistry();
    const connector = new GitHubConnector();
    registry.register(connector);

    expect(registry.get('github')).toBe(connector);
    expect(registry.get('unknown')).toBeNull();
  });
});
