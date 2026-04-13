import { useEffect, useRef, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { IconButton } from "../atoms/IconButton";
import { TAG_NAMES } from "../../types";

interface DocumentSearchBarProps {
  title: string;
  tag: string;
  folder: string;
  folders: string[];
  favorite: boolean;
  onTitleChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onFavoriteChange: (value: boolean) => void;
}

const tagOptions = [
  { value: "", label: "All tags" },
  ...TAG_NAMES.map((tag) => ({ value: tag, label: tag })),
];

export function DocumentSearchBar({ title, tag, folder, folders, favorite, onTitleChange, onTagChange, onFolderChange, onFavoriteChange }: DocumentSearchBarProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const folderOptions = [
    { value: "", label: "All folders" },
    ...folders.map((f) => ({ value: f, label: f })),
  ];

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
      <div style={{ minWidth: 120, flex: "0 1 160px" }}>
        <Select
          options={folderOptions}
          value={folder}
          onChange={(e) => onFolderChange(e.target.value)}
        />
      </div>
      <IconButton
        icon={favorite ? "star" : "star_border"}
        size={20}
        onClick={() => onFavoriteChange(!favorite)}
        aria-label={favorite ? "Show all documents" : "Show favorites only"}
        aria-pressed={favorite}
        style={{
          color: favorite ? t.colorWarning : t.colorTextMuted,
          flexShrink: 0,
        }}
      />
    </div>
  );
}
