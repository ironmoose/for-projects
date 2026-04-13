import { semantic as t } from "@4lt7ab/ui/core";
import { SectionLabel } from "../atoms/SectionLabel";
import { MetaValue } from "../atoms/MetaValue";
import { Stack } from "@4lt7ab/ui/ui";

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
  return (
    <div style={style}>
      {title && (
        <SectionLabel style={{ marginBottom: t.spaceSm }}>
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
