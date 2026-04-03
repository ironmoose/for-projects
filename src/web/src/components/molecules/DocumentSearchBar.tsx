import { useEffect, useRef, useState } from "react";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { IconButton } from "../atoms/IconButton";
import { useTheme } from "../theme/ThemeContext";
import { TAG_NAMES } from "../../types";

interface DocumentSearchBarProps {
  title: string;
  tag: string;
  favorite: boolean;
  onTitleChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onFavoriteChange: (value: boolean) => void;
}

const tagOptions = [
  { value: "", label: "All tags" },
  ...TAG_NAMES.map((t) => ({ value: t, label: t })),
];

export function DocumentSearchBar({ title, tag, favorite, onTitleChange, onTagChange, onFavoriteChange }: DocumentSearchBarProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  function handleTitleInput(value: string) {
    setLocalTitle(value);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      onTitleChange(value);
    }, 350);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
      <div style={{ minWidth: 180, flex: "1 1 180px" }}>
        <Input
          placeholder="Search documents..."
          value={localTitle}
          onChange={(e) => handleTitleInput(e.target.value)}
        />
      </div>
      <div style={{ minWidth: 120, flex: "0 1 160px" }}>
        <Select
          options={tagOptions}
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
        />
      </div>
      <IconButton
        icon={favorite ? "star" : "star_border"}
        size={20}
        onClick={() => onFavoriteChange(!favorite)}
        aria-label={favorite ? "Show all documents" : "Show favorites only"}
        style={{
          color: favorite ? theme.color.warning : theme.color.textMuted,
          flexShrink: 0,
        }}
      />
    </div>
  );
}
