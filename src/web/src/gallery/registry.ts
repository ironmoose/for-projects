export interface PropDef {
  name: string;
  type: "string" | "enum" | "boolean" | "number";
  defaultValue: string | boolean | number;
  options?: string[];
  description?: string;
}

export interface ComponentEntry {
  name: string;
  description: string;
  category: "atom" | "molecule" | "organism" | "template";
  propDefs: PropDef[];
  render: (props: Record<string, unknown>) => React.ReactNode;
  variants?: { name: string; props: Record<string, unknown> }[];
  codeTemplate?: string;
}

const entries: ComponentEntry[] = [];

export function registerComponent(entry: ComponentEntry): void {
  entries.push(entry);
}

export function getComponents(): ComponentEntry[] {
  return entries;
}

export function getComponent(name: string): ComponentEntry | undefined {
  return entries.find((e) => e.name === name);
}
