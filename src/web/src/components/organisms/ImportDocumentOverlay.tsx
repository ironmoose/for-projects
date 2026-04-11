import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";
import { SectionLabel } from "../atoms/SectionLabel";
import { TagPicker } from "../molecules/TagPicker";
import { FolderInput } from "../molecules/FolderInput";
import { CreateEntityOverlay } from "./CreateEntityOverlay";
import type { TagName } from "../../types";

interface ImportDocumentOverlayProps {
  folders?: string[];
  onImport: (fields: { url: string; tags?: string[]; folder?: string | null }) => Promise<void>;
  onClose: () => void;
}

export function ImportDocumentOverlay({ folders = [], onImport, onClose }: ImportDocumentOverlayProps) {
  const { theme } = useTheme();
  const [url, setUrl] = useState("");
  const [folder, setFolder] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await onImport({
        url: url.trim(),
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        folder: folder.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CreateEntityOverlay
      title="Import from URL"
      submitLabel="Import"
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={loading}
      submitDisabled={!url.trim()}
    >
      <div
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          paddingRight: theme.spacing.xs,
        }}
      >
        <Input
          label="URL"
          id="import-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/blob/main/README.md"
        />

        <FolderInput
          value={folder}
          folders={folders}
          onChange={setFolder}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
          <SectionLabel>Tags</SectionLabel>
          <TagPicker selected={selectedTags} onChange={setSelectedTags} />
        </div>
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            fontSize: theme.font.size.sm,
            color: theme.color.danger,
            fontFamily: theme.font.body,
          }}
        >
          {error}
        </p>
      )}
    </CreateEntityOverlay>
  );
}
