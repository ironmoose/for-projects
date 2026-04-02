import { useEffect, useRef, useState } from "react";
import { Input } from "../atoms/Input";

interface DocumentSearchBarProps {
  title: string;
  tag: string;
  onTitleChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

export function DocumentSearchBar({ title, tag, onTitleChange, onTagChange }: DocumentSearchBarProps) {
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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
      <div style={{ minWidth: 180, flex: "1 1 180px" }}>
        <Input
          placeholder="Search documents..."
          value={localTitle}
          onChange={(e) => handleTitleInput(e.target.value)}
        />
      </div>
      <div style={{ minWidth: 120, flex: "0 1 160px" }}>
        <Input
          placeholder="Filter by tag..."
          value={localTag}
          onChange={(e) => handleTagInput(e.target.value)}
        />
      </div>
    </div>
  );
}
