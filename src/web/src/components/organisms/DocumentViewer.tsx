import { useTheme } from "../theme/ThemeContext";
import { Markdown } from "../molecules/Markdown";

interface DocumentViewerProps {
  content: string | null;
}

export function DocumentViewer({ content }: DocumentViewerProps) {
  const { theme } = useTheme();

  if (!content) {
    return (
      <p
        style={{
          margin: 0,
          fontSize: theme.font.size.sm,
          color: theme.color.textFaint,
          fontStyle: "italic",
        }}
      >
        No content
      </p>
    );
  }

  return <Markdown>{content}</Markdown>;
}
