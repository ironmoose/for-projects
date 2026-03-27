import { viewerTheme as vt } from "./viewerTheme";

interface CodeSnippetProps {
  code: string;
}

export function CodeSnippet({ code }: CodeSnippetProps) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        background: vt.surfaceHigh,
        border: `1px solid ${vt.border}`,
        borderRadius: 6,
        fontSize: 11,
        fontFamily: vt.mono,
        color: vt.text,
        overflow: "auto",
        whiteSpace: "pre-wrap",
        lineHeight: 1.6,
      }}
    >
      {code}
    </pre>
  );
}
