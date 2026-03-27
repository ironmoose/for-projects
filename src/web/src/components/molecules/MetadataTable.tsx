import { useTheme } from "../theme/ThemeContext";
import { SectionLabel } from "../atoms/SectionLabel";
import { MetaValue } from "../atoms/MetaValue";
import { Stack } from "./Stack";

interface MetadataRow {
  label: string;
  value: string;
}

interface MetadataTableProps {
  title?: string;
  rows: MetadataRow[];
  style?: React.CSSProperties;
}

export function MetadataTable({ title, rows, style }: MetadataTableProps) {
  const { theme } = useTheme();

  return (
    <div style={style}>
      {title && (
        <SectionLabel style={{ marginBottom: theme.spacing.sm }}>
          {title}
        </SectionLabel>
      )}
      <Stack gap="xs">
        {rows.map((row) => (
          <MetaValue key={row.label} label={row.label} value={row.value} />
        ))}
      </Stack>
    </div>
  );
}
