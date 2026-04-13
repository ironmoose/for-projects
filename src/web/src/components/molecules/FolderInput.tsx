import { useEffect, useRef, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Input, Field } from "@4lt7ab/ui/ui";

interface FolderInputProps {
  value: string;
  folders: string[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function FolderInput({ value, folders, onChange, label = "Folder", placeholder = "Type or select a folder..." }: FolderInputProps) {
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
      <Field label={label} htmlFor="document-folder">
        <Input
          id="document-folder"
          value={localValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
      </Field>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            marginTop: 2,
            background: t.colorSurface,
            border: `1px solid ${t.colorBorder}`,
            borderRadius: t.radiusMd,
            boxShadow: t.shadowMd,
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
                padding: `${t.spaceXs} ${t.spaceSm}`,
                border: "none",
                background: "none",
                color: t.colorText,
                fontSize: t.fontSizeSm,
                fontFamily: t.fontSans,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: t.colorTextMuted }}>
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
