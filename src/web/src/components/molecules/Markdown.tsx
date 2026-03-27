import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import type { Theme } from "../theme/theme";

function buildComponents(theme: Theme): Components {
  const { color, font, spacing, radius } = theme;

  return {
    p: ({ children }) => (
      <p style={{ margin: 0, marginBottom: spacing.sm, lineHeight: 1.75, color: color.text, fontSize: font.size.md }}>
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1
        style={{
          margin: 0,
          marginBottom: spacing.md,
          fontFamily: font.headline,
          fontSize: font.size.xl,
          fontWeight: 700,
          color: color.text,
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        style={{
          margin: 0,
          marginBottom: spacing.sm,
          fontFamily: font.headline,
          fontSize: font.size.lg,
          fontWeight: 600,
          color: color.text,
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        style={{
          margin: 0,
          marginBottom: spacing.xs,
          fontFamily: font.headline,
          fontSize: font.size.md,
          fontWeight: 600,
          color: color.text,
        }}
      >
        {children}
      </h3>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: color.primary, textDecoration: "underline" }}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: 0, marginBottom: spacing.sm, paddingLeft: spacing.xl, color: color.text }}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: 0, marginBottom: spacing.sm, paddingLeft: spacing.xl, color: color.text }}>{children}</ol>
    ),
    li: ({ children }) => <li style={{ lineHeight: 1.75, fontSize: font.size.md }}>{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        style={{
          margin: 0,
          marginBottom: spacing.sm,
          paddingLeft: spacing.md,
          borderLeft: `3px solid ${color.primary}`,
          color: color.textMuted,
        }}
      >
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.startsWith("language-");
      if (isBlock) {
        return (
          <code
            style={{
              display: "block",
              fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace",
              fontSize: font.size.sm,
              lineHeight: 1.6,
              color: color.text,
            }}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace",
            fontSize: "0.9em",
            background: color.surfaceContainerHigh,
            borderRadius: radius.sm,
            padding: "1px 5px",
            color: color.primary,
          }}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        style={{
          margin: 0,
          marginBottom: spacing.sm,
          padding: spacing.md,
          background: color.surfaceContainerHigh,
          borderRadius: radius.lg,
          overflowX: "auto",
        }}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: "auto", marginBottom: spacing.sm }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: font.size.sm,
            color: color.text,
          }}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th
        style={{
          textAlign: "left",
          padding: `${spacing.xs} ${spacing.sm}`,
          borderBottom: `2px solid ${color.border}`,
          fontWeight: 600,
          color: color.textMuted,
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        style={{
          padding: `${spacing.xs} ${spacing.sm}`,
          borderBottom: `1px solid ${color.borderSubtle}`,
        }}
      >
        {children}
      </td>
    ),
    hr: () => (
      <hr
        style={{
          border: "none",
          borderTop: `1px solid ${color.border}`,
          margin: `${spacing.md} 0`,
        }}
      />
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 600, color: color.text }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: color.textMuted }}>{children}</em>,
    del: ({ children }) => <del style={{ color: color.textFaint }}>{children}</del>,
  };
}

export interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  const { theme } = useTheme();
  const components = useMemo(() => buildComponents(theme), [theme]);

  return (
    <div style={{ fontFamily: theme.font.body, fontSize: theme.font.size.md, color: theme.color.text }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
