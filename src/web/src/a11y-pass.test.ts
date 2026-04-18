/**
 * a11y-pass.test.ts — static accessibility guardrails for the web client.
 *
 * This suite is intentionally lightweight: it reads every `.tsx` file under
 * `src/web/src/` and asserts the patterns CLAUDE.md calls out as load-bearing
 * a11y rules. No DOM, no React runtime — it's a smart grep that runs in the
 * regular `bun test` pass and fails loud when someone ships a bare IconButton
 * or a keyboard-unreachable `role="button"`.
 *
 * Rules enforced
 * --------------
 *  1. Every `<IconButton ...>` has an `aria-label` attribute.
 *  2. Every JSX element with `role="button"` has an `aria-label` (an accessible
 *     name is required once you opt into button semantics).
 *  3. Every JSX element with `role="button"` or `tabIndex={0}` has an
 *     `onKeyDown` handler (so keyboard users can activate it).
 *
 * Update this file when adding a new kind of interactive component so the bar
 * keeps pace with the UI. Deleting rules is a big deal — don't.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const WEB_SRC_ROOT = join(import.meta.dir);

function findTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...findTsxFiles(full));
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function loadSources(): Array<{ path: string; content: string }> {
  return findTsxFiles(WEB_SRC_ROOT).map((path) => ({
    path,
    content: readFileSync(path, "utf-8"),
  }));
}

// ---------------------------------------------------------------------------
// JSX tag extraction — brace- and string-aware scan so multi-line tags with
// nested `{...}` and `"..."` props don't confuse us.
// ---------------------------------------------------------------------------

/** Return the full opening-tag text (from `<Name` to the matching `>`/`/>`). */
function extractOpeningTags(source: string, componentName: string): string[] {
  const start = `<${componentName}`;
  const tags: string[] = [];
  let idx = 0;
  while ((idx = source.indexOf(start, idx)) !== -1) {
    // Must be followed by whitespace, `>`, or `/` — otherwise this is a prefix
    // match (`<IconButtonX`) and we skip it.
    const next = source[idx + start.length];
    if (!next || !/[\s>/]/.test(next)) {
      idx += start.length;
      continue;
    }
    let i = idx + start.length;
    let depth = 0;
    let inStr: string | null = null;
    let closed = false;
    while (i < source.length) {
      const c = source[i];
      if (inStr) {
        if (c === inStr && source[i - 1] !== "\\") inStr = null;
      } else if (c === '"' || c === "'" || c === "`") {
        inStr = c;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
      } else if (c === ">" && depth === 0) {
        tags.push(source.slice(idx, i + 1));
        idx = i + 1;
        closed = true;
        break;
      }
      i++;
    }
    if (!closed) break;
  }
  return tags;
}

/** Return every JSX opening tag that contains `needle` as an attribute. */
function extractTagsContaining(source: string, needle: string): string[] {
  // Walk every `<` in the file, extract its full opening tag, keep ones with
  // the attribute we care about. Limits false positives vs. a regex sweep.
  const tags: string[] = [];
  let idx = 0;
  while ((idx = source.indexOf("<", idx)) !== -1) {
    // Skip comments, JSX fragments, and closing tags.
    const next = source[idx + 1];
    if (!next || next === "/" || next === "!" || next === ">") {
      idx += 1;
      continue;
    }
    // Identify component/element name — stop at whitespace, `>`, or `/`.
    let nameEnd = idx + 1;
    while (nameEnd < source.length && /[A-Za-z0-9.]/.test(source[nameEnd])) {
      nameEnd++;
    }
    if (nameEnd === idx + 1) {
      idx += 1;
      continue;
    }
    // Walk to the end of the opening tag with brace/string awareness.
    let i = nameEnd;
    let depth = 0;
    let inStr: string | null = null;
    let closed = false;
    while (i < source.length) {
      const c = source[i];
      if (inStr) {
        if (c === inStr && source[i - 1] !== "\\") inStr = null;
      } else if (c === '"' || c === "'" || c === "`") {
        inStr = c;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
      } else if (c === ">" && depth === 0) {
        const tag = source.slice(idx, i + 1);
        if (tag.includes(needle)) tags.push(tag);
        idx = i + 1;
        closed = true;
        break;
      }
      i++;
    }
    if (!closed) break;
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Rule helpers
// ---------------------------------------------------------------------------

function hasAriaLabel(tag: string): boolean {
  return /\baria-label\s*=/.test(tag);
}

function hasOnKeyDown(tag: string): boolean {
  return /\bonKeyDown\s*=/.test(tag);
}

function shortLocation(path: string, tag: string): string {
  const relPath = path.replace(`${WEB_SRC_ROOT}/`, "");
  const compact = tag.replace(/\s+/g, " ").slice(0, 140);
  return `${relPath}: ${compact}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const SOURCES = loadSources();

describe("a11y-pass", () => {
  test("loads at least one TSX source", () => {
    // Sanity check — if this fails, the discovery walk is broken and the other
    // tests would vacuously pass.
    expect(SOURCES.length).toBeGreaterThan(10);
  });

  test("every <IconButton has an aria-label", () => {
    const violations: string[] = [];
    for (const { path, content } of SOURCES) {
      for (const tag of extractOpeningTags(content, "IconButton")) {
        if (!hasAriaLabel(tag)) violations.push(shortLocation(path, tag));
      }
    }
    expect(violations).toEqual([]);
  });

  test("every role=\"button\" element has an aria-label", () => {
    const violations: string[] = [];
    for (const { path, content } of SOURCES) {
      for (const tag of extractTagsContaining(content, 'role="button"')) {
        if (!hasAriaLabel(tag)) violations.push(shortLocation(path, tag));
      }
    }
    expect(violations).toEqual([]);
  });

  test("every role=\"button\" element has an onKeyDown handler", () => {
    const violations: string[] = [];
    for (const { path, content } of SOURCES) {
      for (const tag of extractTagsContaining(content, 'role="button"')) {
        if (!hasOnKeyDown(tag)) violations.push(shortLocation(path, tag));
      }
    }
    expect(violations).toEqual([]);
  });

  test("every tabIndex={0} element has an onKeyDown handler", () => {
    // tabIndex=0 makes something keyboard-focusable; without onKeyDown there's
    // no way to activate it from the keyboard.
    const violations: string[] = [];
    for (const { path, content } of SOURCES) {
      for (const tag of extractTagsContaining(content, "tabIndex={0}")) {
        if (!hasOnKeyDown(tag)) violations.push(shortLocation(path, tag));
      }
    }
    expect(violations).toEqual([]);
  });
});
