import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import { semantic as t } from "@4lt7ab/ui/core";

function alpha(token: string, pct: number): string {
  return `color-mix(in srgb, ${token} ${pct}%, transparent)`;
}

function buildComponents(): Components {
  return {
    p: ({ children }) => (
      <p style={{ margin: 0, marginBottom: t.spaceSm, lineHeight: 1.75, color: t.colorText, fontSize: t.fontSizeBase }}>
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1
        style={{
          margin: 0,
          marginBottom: t.spaceMd,
          fontFamily: t.fontSerif,
          fontSize: t.fontSizeXl,
          fontWeight: 700,
          color: t.colorText,
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        style={{
          margin: 0,
          marginBottom: t.spaceSm,
          fontFamily: t.fontSerif,
          fontSize: t.fontSizeLg,
          fontWeight: 600,
          color: t.colorText,
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        style={{
          margin: 0,
          marginBottom: t.spaceXs,
          fontFamily: t.fontSerif,
          fontSize: t.fontSizeBase,
          fontWeight: 600,
          color: t.colorText,
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
        style={{ color: t.colorActionPrimary, textDecoration: "underline" }}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: 0, marginBottom: t.spaceSm, paddingLeft: t.spaceXl, color: t.colorText }}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: 0, marginBottom: t.spaceSm, paddingLeft: t.spaceXl, color: t.colorText }}>{children}</ol>
    ),
    li: ({ children }) => <li style={{ lineHeight: 1.75, fontSize: t.fontSizeBase }}>{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        style={{
          margin: 0,
          marginBottom: t.spaceSm,
          paddingLeft: t.spaceMd,
          borderLeft: `3px solid ${t.colorActionPrimary}`,
          color: t.colorTextMuted,
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
              fontFamily: t.fontMono,
              fontSize: t.fontSizeSm,
              lineHeight: 1.5,
              color: t.colorActionPrimary,
            }}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          style={{
            fontFamily: t.fontMono,
            fontSize: "0.9em",
            background: t.colorSurfaceRaised,
            border: `1px solid ${alpha(t.colorBorder, 50)}`,
            borderRadius: t.radiusSm,
            padding: "1px 5px",
            color: t.colorWarning,
            textShadow: `0 0 8px ${alpha(t.colorActionPrimary, 30)}`,
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
          marginBottom: t.spaceSm,
          padding: t.spaceMd,
          background: t.colorSurfaceRaised,
          borderLeft: `2px solid ${t.colorWarning}`,
          borderRadius: t.radiusLg,
          overflowX: "auto",
          boxShadow: `inset 2px 0 12px -4px ${alpha(t.colorActionPrimary, 30)}, ${t.shadowSm}`,
        }}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: "auto", marginBottom: t.spaceSm }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: t.fontSizeSm,
            color: t.colorText,
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
          padding: `${t.spaceXs} ${t.spaceSm}`,
          borderBottom: `2px solid ${t.colorBorder}`,
          fontWeight: 600,
          color: t.colorTextMuted,
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        style={{
          padding: `${t.spaceXs} ${t.spaceSm}`,
          borderBottom: `1px solid ${alpha(t.colorBorder, 50)}`,
        }}
      >
        {children}
      </td>
    ),
    hr: () => (
      <hr
        style={{
          border: "none",
          borderTop: `1px solid ${t.colorBorder}`,
          margin: `${t.spaceMd} 0`,
        }}
      />
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 600, color: t.colorText }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: t.colorTextMuted }}>{children}</em>,
    del: ({ children }) => <del style={{ color: t.colorTextSecondary }}>{children}</del>,
  };
}

export interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  const components = useMemo(() => buildComponents(), []);

  return (
    <div style={{ fontFamily: t.fontSans, fontSize: t.fontSizeBase, color: t.colorText }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
