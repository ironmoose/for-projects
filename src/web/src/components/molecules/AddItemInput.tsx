import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Stack } from "./Stack";

interface AddItemInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function AddItemInput({ placeholder, value, onChange, onSubmit, loading, style }: AddItemInputProps) {
  const { theme } = useTheme();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} style={style}>
      <Stack direction="row" gap="xs" align="flex-end">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <Button type="submit" size="md" disabled={loading}>
          <Icon name={loading ? "hourglass_empty" : "add"} size={16} />
        </Button>
      </Stack>
    </form>
  );
}
