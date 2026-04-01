import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";
import { Textarea } from "../atoms/Textarea";
import { CreateEntityOverlay } from "./CreateEntityOverlay";

interface CreateProjectOverlayProps {
  onCreated: (fields: { title: string; goal?: string; requirements?: string; design?: string }) => Promise<void>;
  onClose: () => void;
}

export function CreateProjectOverlay({ onCreated, onClose }: CreateProjectOverlayProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [requirements, setRequirements] = useState("");
  const [design, setDesign] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await onCreated({
        title: title.trim(),
        goal: goal.trim() || undefined,
        requirements: requirements.trim() || undefined,
        design: design.trim() || undefined,
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

      <Textarea
        label="Goal"
        id="project-goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What is the goal of this project? (optional)"
      />

      <Textarea
        label="Requirements"
        id="project-requirements"
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder="Requirements for the project (optional)"
      />

      <Textarea
        label="Design"
        id="project-design"
        value={design}
        onChange={(e) => setDesign(e.target.value)}
        placeholder="Design notes (optional)"
      />

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
