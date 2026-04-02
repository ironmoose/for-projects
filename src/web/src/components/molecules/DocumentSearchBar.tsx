import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";

interface DocumentSearchBarProps {
  title: string;
  tag: string;
  onTitleChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

export function DocumentSearchBar({ title, tag, onTitleChange, onTagChange }: DocumentSearchBarProps) {
  const { theme } = useTheme();
  const [localTitle, setLocalTitle] = useState(title);
  const [localTag, setLocalTag] = useState(tag);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalTag(tag);
  }, [tag]);

  function handleTitleInput(value: string) {
    setLocalTitle(value);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      onTitleChange(value);
    }, 350);
  }

  function handleTagInput(value: string) {
    setLocalTag(value);
    if (tagTimerRef.current) clearTimeout(tagTimerRef.current);
    tagTimerRef.current = setTimeout(() => {
      onTagChange(value);
    }, 350);
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
      }}
    >
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <Input
          label="Search title"
          placeholder="Filter by title..."
          value={localTitle}
          onChange={(e) => handleTitleInput(e.target.value)}
        />
      </div>
      <div style={{ flex: "0 1 200px", minWidth: 0 }}>
        <Input
          label="Filter tag"
          placeholder="e.g. design"
          value={localTag}
          onChange={(e) => handleTagInput(e.target.value)}
        />
      </div>
    </div>
  );
}
