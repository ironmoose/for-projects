import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";

interface FolderInputProps {
  value: string;
  folders: string[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function FolderInput({ value, folders, onChange, label = "Folder", placeholder = "Type or select a folder..." }: FolderInputProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = localValue
    ? folders.filter((f) => f.toLowerCase().includes(localValue.toLowerCase()) && f !== localValue)
    : folders.filter((f) => f !== localValue);

  function handleInput(v: string) {
    setLocalValue(v);
    onChange(v);
    setOpen(true);
  }

  function handleSelect(folder: string) {
    setLocalValue(folder);
    onChange(folder);
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Input
        label={label}
        id="document-folder"
        value={localValue}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            marginTop: 2,
            background: theme.color.surface,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.radius.md,
            boxShadow: theme.shadow.md,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {filtered.map((f) => (
            <button
              key={f}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(f)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                border: "none",
                background: "none",
                color: theme.color.text,
                fontSize: theme.font.size.sm,
                fontFamily: theme.font.body,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: theme.color.textMuted }}>
                folder
              </span>
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
