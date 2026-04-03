import { registerComponent } from "./registry";
import {
  Button,
  Badge,
  Icon,
  IconButton,
  Input,
  Select,
  SectionLabel,
  StatusDot,
  MetaValue,
  ProgressBar,
  Card,
  Stack,
  BackButton,
  EmptyState,
  TagChip,
  Skeleton,
  CardSkeleton,
  RowSkeleton,
  ExpandableCard,
} from "../components";
import type { ProgressBarSegment } from "../components";

export function registerAllComponents(): void {
  // Atoms
  registerComponent({
    name: "Button",
    description: "Primary action button with variants and sizes.",
    category: "atom",
    propDefs: [
      { name: "variant", type: "enum", defaultValue: "primary", options: ["primary", "ghost"] },
      { name: "size", type: "enum", defaultValue: "md", options: ["sm", "md"] },
      { name: "children", type: "string", defaultValue: "Click Me" },
      { name: "disabled", type: "boolean", defaultValue: false },
    ],
    render: (props) => (
      <Button
        variant={props.variant as "primary" | "ghost"}
        size={props.size as "sm" | "md"}
        disabled={props.disabled as boolean}
      >
        {String(props.children)}
      </Button>
    ),
    variants: [
      { name: "Primary", props: { variant: "primary" } },
      { name: "Ghost", props: { variant: "ghost" } },
      { name: "Small", props: { size: "sm" } },
      { name: "Disabled", props: { disabled: true } },
    ],
    codeTemplate: `<Button variant="primary" size="md">Click Me</Button>`,
  });

  registerComponent({
    name: "Badge",
    description: "Status indicator badge.",
    category: "atom",
    propDefs: [
      { name: "variant", type: "enum", defaultValue: "active", options: ["active", "paused", "completed", "archived", "default"] },
      { name: "children", type: "string", defaultValue: "active" },
    ],
    render: (props) => <Badge variant={props.variant as "active"}>{String(props.children)}</Badge>,
    variants: [
      { name: "Active", props: { variant: "active", children: "active" } },
      { name: "Paused", props: { variant: "paused", children: "paused" } },
      { name: "Completed", props: { variant: "completed", children: "completed" } },
      { name: "Archived", props: { variant: "archived", children: "archived" } },
    ],
    codeTemplate: `<Badge variant="active">active</Badge>`,
  });

  registerComponent({
    name: "Icon",
    description: "Material Symbols icon wrapper.",
    category: "atom",
    propDefs: [
      { name: "name", type: "string", defaultValue: "check_circle" },
      { name: "size", type: "number", defaultValue: 24 },
    ],
    render: (props) => <Icon name={String(props.name)} size={Number(props.size)} />,
    codeTemplate: `<Icon name="check_circle" size={24} />`,
  });

  registerComponent({
    name: "IconButton",
    description: "Circular icon button.",
    category: "atom",
    propDefs: [
      { name: "icon", type: "string", defaultValue: "settings" },
      { name: "size", type: "number", defaultValue: 24 },
      { name: "badge", type: "boolean", defaultValue: false },
    ],
    render: (props) => <IconButton icon={String(props.icon)} size={Number(props.size)} badge={props.badge as boolean} />,
    codeTemplate: `<IconButton icon="settings" size={24} />`,
  });

  registerComponent({
    name: "Input",
    description: "Text input field with optional label.",
    category: "atom",
    propDefs: [
      { name: "label", type: "string", defaultValue: "Label" },
      { name: "placeholder", type: "string", defaultValue: "Enter text..." },
    ],
    render: (props) => <Input label={String(props.label)} placeholder={String(props.placeholder)} />,
    codeTemplate: `<Input label="Label" placeholder="Enter text..." />`,
  });

  registerComponent({
    name: "Select",
    description: "Dropdown select.",
    category: "atom",
    propDefs: [
      { name: "value", type: "enum", defaultValue: "a", options: ["a", "b", "c"] },
    ],
    render: (props) => (
      <Select
        value={String(props.value)}
        options={[{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }, { value: "c", label: "Option C" }]}
        onChange={() => {}}
      />
    ),
    codeTemplate: `<Select value="a" options={[...]} onChange={handleChange} />`,
  });

  registerComponent({
    name: "SectionLabel",
    description: "Uppercase micro-label for section headings.",
    category: "atom",
    propDefs: [
      { name: "children", type: "string", defaultValue: "Section Title" },
    ],
    render: (props) => <SectionLabel>{String(props.children)}</SectionLabel>,
    codeTemplate: `<SectionLabel>Section Title</SectionLabel>`,
  });

  registerComponent({
    name: "StatusDot",
    description: "Small colored circle indicator.",
    category: "atom",
    propDefs: [
      { name: "color", type: "string", defaultValue: "#6dd58c" },
      { name: "size", type: "number", defaultValue: 8 },
    ],
    render: (props) => <StatusDot color={String(props.color)} size={Number(props.size)} />,
    codeTemplate: `<StatusDot color={theme.color.success} />`,
  });

  registerComponent({
    name: "MetaValue",
    description: "Monospace label/value row.",
    category: "atom",
    propDefs: [
      { name: "label", type: "string", defaultValue: "ID" },
      { name: "value", type: "string", defaultValue: "01ABC123" },
    ],
    render: (props) => <MetaValue label={String(props.label)} value={String(props.value)} />,
    codeTemplate: `<MetaValue label="ID" value={item.id} />`,
  });

  registerComponent({
    name: "Skeleton",
    description: "Shimmer loading placeholder.",
    category: "atom",
    propDefs: [
      { name: "width", type: "string", defaultValue: "200px" },
      { name: "height", type: "number", defaultValue: 16 },
    ],
    render: (props) => <Skeleton width={String(props.width)} height={Number(props.height)} />,
    codeTemplate: `<Skeleton width="200px" height={16} />`,
  });

  registerComponent({
    name: "ProgressBar",
    description: "Stacked horizontal bar showing proportional segments with optional hover tooltips.",
    category: "atom",
    propDefs: [
      { name: "height", type: "number", defaultValue: 6 },
    ],
    render: (props) => (
      <ProgressBar
        height={Number(props.height)}
        segments={[
          { value: 3, color: "#8ba8b2", label: "todo" },
          { value: 2, color: "#fcb97b", label: "in_progress" },
          { value: 5, color: "#6dd58c", label: "done" },
          { value: 1, color: "#5a7580", label: "archived" },
        ] as ProgressBarSegment[]}
        style={{ width: 240 }}
      />
    ),
    variants: [
      { name: "All Done", props: {} },
      { name: "Mixed", props: {} },
    ],
    codeTemplate: `<ProgressBar segments={[{ value: 3, color: "green", label: "done" }]} height={6} />`,
  });

  // Molecules
  registerComponent({
    name: "Card",
    description: "Container card with surface background.",
    category: "molecule",
    propDefs: [
      { name: "variant", type: "enum", defaultValue: "default", options: ["default", "flat"] },
      { name: "padding", type: "enum", defaultValue: "lg", options: ["xs", "sm", "md", "lg", "xl", "2xl"] },
    ],
    render: (props) => (
      <Card variant={props.variant as "default" | "flat"} padding={props.padding as "lg"} style={{ width: 200 }}>
        <span>Card content</span>
      </Card>
    ),
    codeTemplate: `<Card variant="default" padding="lg">Content</Card>`,
  });

  registerComponent({
    name: "ExpandableCard",
    description: "Card with clickable header, chevron, and expand/collapse behavior.",
    category: "molecule",
    propDefs: [
      { name: "title", type: "string", defaultValue: "Section Title" },
      { name: "defaultOpen", type: "boolean", defaultValue: false },
      { name: "variant", type: "enum", defaultValue: "default", options: ["default", "flat", "elevated"] },
    ],
    render: (props) => (
      <ExpandableCard
        title={String(props.title)}
        defaultOpen={props.defaultOpen as boolean}
        variant={props.variant as "default" | "flat" | "elevated"}
        style={{ width: 300 }}
      >
        <span>Expandable content goes here. Click the header to toggle.</span>
      </ExpandableCard>
    ),
    variants: [
      { name: "Closed", props: { defaultOpen: false } },
      { name: "Open", props: { defaultOpen: true } },
      { name: "Flat", props: { variant: "flat", defaultOpen: true } },
    ],
    codeTemplate: `<ExpandableCard title="Section" defaultOpen={false}>Content</ExpandableCard>`,
  });

  registerComponent({
    name: "Stack",
    description: "Flexbox stack layout.",
    category: "molecule",
    propDefs: [
      { name: "direction", type: "enum", defaultValue: "column", options: ["row", "column"] },
      { name: "gap", type: "enum", defaultValue: "md", options: ["xs", "sm", "md", "lg", "xl"] },
    ],
    render: (props) => (
      <Stack direction={props.direction as "row" | "column"} gap={props.gap as "md"}>
        <Badge>Item 1</Badge>
        <Badge>Item 2</Badge>
        <Badge>Item 3</Badge>
      </Stack>
    ),
    codeTemplate: `<Stack direction="row" gap="md">...</Stack>`,
  });

  registerComponent({
    name: "BackButton",
    description: "Ghost button with arrow_back icon.",
    category: "molecule",
    propDefs: [
      { name: "label", type: "string", defaultValue: "Back" },
    ],
    render: (props) => <BackButton onClick={() => {}} label={String(props.label)} />,
    codeTemplate: `<BackButton onClick={handleBack} label="All Projects" />`,
  });

  registerComponent({
    name: "EmptyState",
    description: "Centered icon + message for empty lists.",
    category: "molecule",
    propDefs: [
      { name: "icon", type: "string", defaultValue: "folder_open" },
      { name: "message", type: "string", defaultValue: "Nothing here yet." },
      { name: "variant", type: "enum", defaultValue: "plain", options: ["plain", "card"] },
    ],
    render: (props) => <EmptyState icon={String(props.icon)} message={String(props.message)} variant={props.variant as "plain"} />,
    codeTemplate: `<EmptyState icon="folder_open" message="No items yet." />`,
  });

  registerComponent({
    name: "TagChip",
    description: "Tag pill with optional remove button.",
    category: "molecule",
    propDefs: [
      { name: "name", type: "string", defaultValue: "frontend" },
      { name: "prefix", type: "string", defaultValue: "" },
    ],
    render: (props) => (
      <TagChip
        name={String(props.name)}
        prefix={String(props.prefix) || null}
        onRemove={() => {}}
      />
    ),
    codeTemplate: `<TagChip name="frontend" onRemove={handleRemove} />`,
  });

  registerComponent({
    name: "CardSkeleton",
    description: "Loading skeleton shaped like a card.",
    category: "molecule",
    propDefs: [],
    render: () => <CardSkeleton style={{ width: 240 }} />,
    codeTemplate: `<CardSkeleton />`,
  });

  registerComponent({
    name: "RowSkeleton",
    description: "Loading skeleton shaped like a list row.",
    category: "molecule",
    propDefs: [],
    render: () => <RowSkeleton style={{ width: 300 }} />,
    codeTemplate: `<RowSkeleton />`,
  });
}
