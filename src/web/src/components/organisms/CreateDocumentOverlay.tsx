import { useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Input } from "../atoms/Input";
import { Textarea } from "../atoms/Textarea";
import { SectionLabel } from "../atoms/SectionLabel";
import { TagPicker } from "../molecules/TagPicker";
import { FolderInput } from "../molecules/FolderInput";
import { CreateEntityOverlay } from "./CreateEntityOverlay";
import type { TagName } from "../../types";

interface CreateDocumentOverlayProps {
  folders?: string[];
  onCreated: (fields: { title: string; summary?: string; content?: string; tags?: string[]; folder?: string | null }) => Promise<void>;
  onClose: () => void;
}

export function CreateDocumentOverlay({ folders = [], onCreated, onClose }: CreateDocumentOverlayProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await onCreated({
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim() || undefined,
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
      title="Create Document"
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={loading}
      submitDisabled={!title.trim()}
    >
      <div
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: t.spaceLg,
          paddingRight: t.spaceXs,
        }}
      >
        <Input
          label="Title"
          id="document-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title..."
        />

        <Input
          label="Summary"
          id="document-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief description (optional)"
        />

        <Textarea
          label="Content"
          id="document-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Markdown content (optional)"
          rows={8}
        />

        <FolderInput
          value={folder}
          folders={folders}
          onChange={setFolder}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: t.spaceXs }}>
          <SectionLabel>Tags</SectionLabel>
          <TagPicker selected={selectedTags} onChange={setSelectedTags} />
        </div>
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            fontSize: t.fontSizeSm,
            color: t.colorActionDestructive,
            fontFamily: t.fontSans,
          }}
        >
          {error}
        </p>
      )}
    </CreateEntityOverlay>
  );
}
