import { useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Input } from "../atoms/Input";
import { CreateEntityOverlay } from "./CreateEntityOverlay";

interface CreateProjectOverlayProps {
  onCreated: (fields: { title: string; summary?: string }) => Promise<void>;
  onClose: () => void;
}

export function CreateProjectOverlay({ onCreated, onClose }: CreateProjectOverlayProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
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
      title="Create Project"
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={loading}
      submitDisabled={!title.trim()}
    >
      <Input
        label="Title"
        id="project-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Project title..."
      />

      <Input
        label="Summary"
        id="project-summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Brief project summary (optional)"
      />

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
