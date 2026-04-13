import { useState } from "react";
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
  TagPicker,
  ExpandableCard,
  DependencyChip,
  ReferenceTypeBadge,
  Textarea,
  ActivityIndicator,
  Markdown,
  PageHeader,
  Pagination,
  MetadataTable,
  DocumentSearchBar,
  TaskTableFilters,
  ModalShell,
  ConfirmDialog,
  TopBar,
  ConnectionStatus,
  DisconnectionBanner,
  CreateEntityOverlay,
  CreateProjectOverlay,
  CreateTaskOverlay,
  CreateDocumentOverlay,
  DocumentReaderModal,
  DocumentReferenceCard,
  DocumentReferencePicker,
  SearchToggle,
  ShortcutHelpOverlay,
  TaskTable,
  DocumentTable,
  ProjectDocumentTable,
  DependencyGraphView,
  ListPageLayout,
  DetailPageLayout,
} from "../components";
import type { NavItem } from "../components";
import type { TagName, TaskStatus } from "../types";
import type { ProgressBarSegment } from "../components";
import type { TaskSummary, DocumentSummary } from "../types";
import type { GraphNode } from "../api";
import { FolderInput } from "../components/molecules/FolderInput";
import { AppThemePicker } from "../components/molecules/AppThemePicker";

// ---------------------------------------------------------------------------
// Demo wrapper components (stateful)
// ---------------------------------------------------------------------------

function TagPickerDemo() {
  const [selected, setSelected] = useState<TagName[]>(["ui", "conventions"]);
  return <TagPicker selected={selected} onChange={setSelected} />;
}

function DocumentSearchBarDemo() {
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [folder, setFolder] = useState("");
  const [favorite, setFavorite] = useState(false);
  return (
    <DocumentSearchBar
      title={title}
      tag={tag}
      folder={folder}
      folders={["architecture", "conventions", "onboarding"]}
      favorite={favorite}
      onTitleChange={setTitle}
      onTagChange={setTag}
      onFolderChange={setFolder}
      onFavoriteChange={setFavorite}
    />
  );
}

function TaskTableFiltersDemo() {
  const [filter, setFilter] = useState<{
    status?: string;
    effort?: string;
    impact?: string;
    category?: string;
    group_key?: string;
    title?: string;
  }>({});
  return (
    <TaskTableFilters
      filter={filter}
      onChange={setFilter}
      groupKeys={["backend", "frontend", "infrastructure"]}
    />
  );
}

function FolderInputDemo() {
  const [value, setValue] = useState("");
  return (
    <FolderInput
      value={value}
      folders={["architecture", "conventions", "onboarding", "api-docs"]}
      onChange={setValue}
    />
  );
}

function ModalShellDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      {open && (
        <ModalShell onClose={() => setOpen(false)} title="Modal Title">
          <p style={{ margin: 0 }}>This is the modal content area. Press Escape or click the overlay to close.</p>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        </ModalShell>
      )}
    </>
  );
}

function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete Item</Button>
      {open && (
        <ConfirmDialog
          title="Delete this item?"
          message="This action cannot be undone. The item and all associated data will be permanently removed."
          confirmLabel="Delete"
          onConfirm={async () => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mock data for organisms
// ---------------------------------------------------------------------------

const MOCK_TASKS: TaskSummary[] = [
  { id: "01TASK001", project_id: "01PROJ001", title: "Set up database migrations", summary: null, status: "done" as TaskStatus, effort: "medium", impact: "high", category: "backend", group_key: "infrastructure", is_blocked: false, created_at: "2026-03-15T10:00:00Z", updated_at: "2026-03-20T14:30:00Z" },
  { id: "01TASK002", project_id: "01PROJ001", title: "Implement REST API endpoints", summary: "Build CRUD routes for projects and tasks", status: "in_progress" as TaskStatus, effort: "high", impact: "high", category: "backend", group_key: "api", is_blocked: false, created_at: "2026-03-16T09:00:00Z", updated_at: "2026-04-01T11:00:00Z" },
  { id: "01TASK003", project_id: "01PROJ001", title: "Design component gallery page", summary: null, status: "todo" as TaskStatus, effort: "low", impact: "medium", category: "frontend", group_key: "ui", is_blocked: false, created_at: "2026-03-18T08:00:00Z", updated_at: "2026-03-18T08:00:00Z" },
  { id: "01TASK004", project_id: "01PROJ001", title: "Write integration tests for task service", summary: null, status: "todo" as TaskStatus, effort: "medium", impact: "medium", category: "backend", group_key: "api", is_blocked: true, created_at: "2026-03-19T10:00:00Z", updated_at: "2026-03-19T10:00:00Z" },
];

const MOCK_DOCUMENTS: DocumentSummary[] = [
  { id: "01DOC001", title: "Architecture Decision Record: SQLite", summary: "Why we chose SQLite over Postgres for the project management tool", folder: "architecture", favorite: true, has_content: true, tags: ["architecture", "backend"], linked_projects: [{ id: "01PROJ001", title: "tab-for-projects" }], created_at: "2026-02-01T10:00:00Z", updated_at: "2026-03-15T14:30:00Z" },
  { id: "01DOC002", title: "API Conventions Guide", summary: "Standards for REST endpoints, error handling, and validation", folder: "conventions", favorite: false, has_content: true, tags: ["conventions", "api"], linked_projects: [{ id: "01PROJ001", title: "tab-for-projects" }, { id: "01PROJ002", title: "another-project" }], created_at: "2026-02-10T09:00:00Z", updated_at: "2026-03-20T11:00:00Z" },
  { id: "01DOC003", title: "Frontend Component Patterns", summary: "Atomic design patterns used across the UI", folder: "conventions", favorite: false, has_content: false, tags: ["ui", "conventions"], linked_projects: [], created_at: "2026-02-15T08:00:00Z", updated_at: "2026-02-15T08:00:00Z" },
  { id: "01DOC004", title: "Sprint Retrospective Notes", summary: null, folder: null, favorite: false, has_content: true, tags: [], linked_projects: [], created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
];

const MOCK_GRAPH_TASKS: GraphNode[] = [
  { id: "01G001", title: "Define schema", status: "done" as TaskStatus },
  { id: "01G002", title: "Build repository layer", status: "in_progress" as TaskStatus },
  { id: "01G003", title: "Write service tests", status: "todo" as TaskStatus },
  { id: "01G004", title: "Implement API routes", status: "todo" as TaskStatus },
];

const MOCK_GRAPH_EDGES = [
  { source_task_id: "01G001", target_task_id: "01G002", dependency_type: "blocks" as const },
  { source_task_id: "01G002", target_task_id: "01G003", dependency_type: "blocks" as const },
  { source_task_id: "01G002", target_task_id: "01G004", dependency_type: "blocks" as const },
  { source_task_id: "01G003", target_task_id: "01G004", dependency_type: "relates_to" as const },
];

const MOCK_NAV_ITEMS: NavItem[] = [
  { label: "Projects", path: "/projects", icon: "folder" },
  { label: "Documents", path: "/documents", icon: "description" },
  { label: "Gallery", path: "/gallery", icon: "palette" },
];

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerAllComponents(): void {
  // =========================================================================
  // Atoms
  // =========================================================================

  registerComponent({
    name: "Button",
    description: "Primary action button with variants and sizes.",
    category: "atom",
    propDefs: [
      { name: "variant", type: "enum", defaultValue: "primary", options: ["primary", "ghost", "danger", "icon"] },
      { name: "size", type: "enum", defaultValue: "md", options: ["sm", "md"] },
      { name: "children", type: "string", defaultValue: "Click Me" },
      { name: "disabled", type: "boolean", defaultValue: false },
    ],
    render: (props) => (
      <Button
        variant={props.variant as "primary" | "ghost" | "danger" | "icon"}
        size={props.size as "sm" | "md"}
        disabled={props.disabled as boolean}
      >
        {String(props.children)}
      </Button>
    ),
    variants: [
      { name: "Primary", props: { variant: "primary" } },
      { name: "Ghost", props: { variant: "ghost" } },
      { name: "Danger", props: { variant: "danger", children: "Delete" } },
      { name: "Icon", props: { variant: "icon", children: "\u2605" } },
      { name: "Small", props: { size: "sm" } },
      { name: "Disabled", props: { disabled: true } },
    ],
    codeTemplate: `<Button variant="primary" size="md">Click Me</Button>`,
    migrated: true,
  });

  registerComponent({
    name: "Badge",
    description: "Domain-specific status badge with 12 variants and synth-theme glow support. Uses library tokens (t.*) with useTheme() retained only for glow effects.",
    category: "atom",
    propDefs: [
      { name: "variant", type: "enum", defaultValue: "active", options: ["active", "archived", "default", "pending", "running", "complete", "failed", "skipped", "todo", "in_progress", "done", "warning"] },
      { name: "children", type: "string", defaultValue: "active" },
    ],
    render: (props) => <Badge variant={props.variant as "active"}>{String(props.children)}</Badge>,
    variants: [
      { name: "Active", props: { variant: "active", children: "active" } },
      { name: "Running", props: { variant: "running", children: "running" } },
      { name: "Complete", props: { variant: "complete", children: "complete" } },
      { name: "Failed", props: { variant: "failed", children: "failed" } },
      { name: "In Progress", props: { variant: "in_progress", children: "in progress" } },
      { name: "Done", props: { variant: "done", children: "done" } },
      { name: "Warning", props: { variant: "warning", children: "warning" } },
      { name: "Todo", props: { variant: "todo", children: "todo" } },
      { name: "Pending", props: { variant: "pending", children: "pending" } },
      { name: "Skipped", props: { variant: "skipped", children: "skipped" } },
      { name: "Archived", props: { variant: "archived", children: "archived" } },
      { name: "Default", props: { variant: "default", children: "default" } },
    ],
    codeTemplate: `<Badge variant="active">active</Badge>`,
    migrated: true,
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
    migrated: true,
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
    migrated: true,
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
    migrated: true,
  });

  registerComponent({
    name: "Textarea",
    description: "Multi-line text area with optional label, matching Input styling.",
    category: "atom",
    propDefs: [
      { name: "label", type: "string", defaultValue: "Description" },
      { name: "placeholder", type: "string", defaultValue: "Enter details..." },
    ],
    render: (props) => <Textarea label={String(props.label)} placeholder={String(props.placeholder)} />,
    codeTemplate: `<Textarea label="Description" placeholder="Enter details..." />`,
    migrated: true,
  });

  registerComponent({
    name: "ActivityIndicator",
    description: "Animated count badge that displays a number, showing 99+ for counts above 99.",
    category: "atom",
    propDefs: [
      { name: "count", type: "number", defaultValue: 5 },
    ],
    render: (props) => <ActivityIndicator count={Number(props.count)} />,
    variants: [
      { name: "Zero", props: { count: 0 } },
      { name: "Single digit", props: { count: 3 } },
      { name: "Double digit", props: { count: 42 } },
      { name: "Overflow (99+)", props: { count: 150 } },
    ],
    codeTemplate: `<ActivityIndicator count={unreadCount} />`,
    migrated: true,
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
    migrated: true,
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
    migrated: true,
    libraryCandidate: true,
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
    migrated: true,
    libraryCandidate: true,
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
    migrated: true,
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
    migrated: true,
    libraryCandidate: true,
  });

  registerComponent({
    name: "ReferenceTypeBadge",
    description: "Badge displaying a document reference type with consistent labeling.",
    category: "atom",
    propDefs: [
      { name: "type", type: "enum", defaultValue: "goal", options: ["goal", "plan", "requirements", "design", "reference", "note"] },
    ],
    render: (props) => <ReferenceTypeBadge type={String(props.type)} />,
    variants: [
      { name: "Goal", props: { type: "goal" } },
      { name: "Plan", props: { type: "plan" } },
      { name: "Requirements", props: { type: "requirements" } },
      { name: "Design", props: { type: "design" } },
      { name: "Reference", props: { type: "reference" } },
      { name: "Note", props: { type: "note" } },
    ],
    codeTemplate: `<ReferenceTypeBadge type="goal" />`,
    migrated: true,
  });

  // =========================================================================
  // Molecules
  // =========================================================================

  registerComponent({
    name: "Card",
    description: "Container card with surface background and multiple visual variants.",
    category: "molecule",
    propDefs: [
      { name: "variant", type: "enum", defaultValue: "default", options: ["default", "flat", "live", "elevated"] },
      { name: "padding", type: "enum", defaultValue: "lg", options: ["xs", "sm", "md", "lg", "xl", "2xl"] },
    ],
    render: (props) => (
      <Card variant={props.variant as "default" | "flat" | "live" | "elevated"} padding={props.padding as "lg"} style={{ width: 200 }}>
        <span>Card content</span>
      </Card>
    ),
    variants: [
      { name: "Default", props: { variant: "default" } },
      { name: "Flat", props: { variant: "flat" } },
      { name: "Live", props: { variant: "live" } },
      { name: "Elevated", props: { variant: "elevated" } },
    ],
    codeTemplate: `<Card variant="default" padding="lg">Content</Card>`,
    libraryCandidate: true,
    migrated: true,
  });

  registerComponent({
    name: "ExpandableCard",
    description:
      "Card with clickable header, chevron, and expand/collapse animation. Supports uncontrolled (defaultOpen) and controlled (open/onToggle) modes for accordion patterns.",
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
      { name: "Collapsed", props: { defaultOpen: false } },
      { name: "Open", props: { defaultOpen: true } },
      { name: "Flat", props: { variant: "flat", defaultOpen: true } },
      { name: "Elevated", props: { variant: "elevated", defaultOpen: true } },
    ],
    codeTemplate: [
      "// Uncontrolled (manages own state)",
      '<ExpandableCard title="Section" defaultOpen={false}>',
      "  Content",
      "</ExpandableCard>",
      "",
      "// Controlled (parent manages state, for accordion patterns)",
      '<ExpandableCard title="Section" open={isOpen} onToggle={setIsOpen}>',
      "  Content",
      "</ExpandableCard>",
    ].join("\n"),
    libraryCandidate: true,
    migrated: true,
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
    libraryCandidate: true,
    migrated: true,
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
    migrated: true,
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
    migrated: true,
    libraryCandidate: true,
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
    libraryCandidate: true,
    migrated: true,
  });

  registerComponent({
    name: "TagPicker",
    description: "Multi-select tag picker grouped by category.",
    category: "molecule",
    propDefs: [],
    render: () => <TagPickerDemo />,
    codeTemplate: `<TagPicker selected={selectedTags} onChange={setSelectedTags} />`,
  });

  registerComponent({
    name: "DependencyChip",
    description: "Clickable chip showing a task dependency with status dot and remove button.",
    category: "molecule",
    propDefs: [
      { name: "taskTitle", type: "string", defaultValue: "Set up database migrations" },
      { name: "taskStatus", type: "enum", defaultValue: "in_progress", options: ["todo", "in_progress", "done", "archived"] },
      { name: "dependencyType", type: "enum", defaultValue: "blocks", options: ["blocks", "relates_to"] },
    ],
    render: (props) => (
      <DependencyChip
        taskId="01ABC123"
        taskTitle={String(props.taskTitle)}
        taskStatus={props.taskStatus as "todo" | "in_progress" | "done" | "archived"}
        dependencyType={props.dependencyType as "blocks" | "relates_to"}
        onClick={() => {}}
        onRemove={() => {}}
      />
    ),
    variants: [
      { name: "Todo", props: { taskStatus: "todo", taskTitle: "Plan API endpoints" } },
      { name: "In Progress", props: { taskStatus: "in_progress", taskTitle: "Build dependency graph" } },
      { name: "Done", props: { taskStatus: "done", taskTitle: "Write unit tests" } },
      { name: "Long Title", props: { taskTitle: "This is a very long task title that should be truncated with ellipsis" } },
    ],
    codeTemplate: `<DependencyChip taskId="..." taskTitle="Task name" taskStatus="todo" dependencyType="blocks" onClick={handleClick} onRemove={handleRemove} />`,
    migrated: true,
  });

  registerComponent({
    name: "Markdown",
    description: "Renders markdown content with themed typography, code blocks, tables, and GFM support.",
    category: "molecule",
    propDefs: [
      { name: "children", type: "string", defaultValue: "## Getting Started\n\nThis is a **bold** statement and an *italic* note.\n\n- First item\n- Second item\n- Third item\n\n```ts\nconst result = await fetchData();\n```" },
    ],
    render: (props) => <Markdown>{String(props.children)}</Markdown>,
    codeTemplate: `<Markdown>{"## Title\\n\\nParagraph with **bold** text."}</Markdown>`,
    libraryCandidate: true,
  });

  registerComponent({
    name: "PageHeader",
    description: "Page-level heading with optional subtitle and trailing action slot.",
    category: "molecule",
    propDefs: [
      { name: "title", type: "string", defaultValue: "All Projects" },
      { name: "subtitle", type: "string", defaultValue: "Manage and track your active projects" },
    ],
    render: (props) => (
      <PageHeader
        title={String(props.title)}
        subtitle={String(props.subtitle) || undefined}
        trailing={<Button size="sm">New Project</Button>}
      />
    ),
    variants: [
      { name: "With subtitle", props: { title: "Documents", subtitle: "Browse and manage knowledge base documents" } },
      { name: "Title only", props: { title: "Settings", subtitle: "" } },
    ],
    codeTemplate: `<PageHeader title="Projects" subtitle="Overview" trailing={<Button>Create</Button>} />`,
    migrated: true,
  });

  registerComponent({
    name: "Pagination",
    description: "Page navigation controls with previous/next buttons and page info.",
    category: "molecule",
    propDefs: [
      { name: "page", type: "number", defaultValue: 2 },
      { name: "totalPages", type: "number", defaultValue: 5 },
      { name: "total", type: "number", defaultValue: 47 },
    ],
    render: (props) => (
      <Pagination
        page={Number(props.page)}
        totalPages={Number(props.totalPages)}
        total={Number(props.total)}
        onPageChange={() => {}}
      />
    ),
    variants: [
      { name: "First page", props: { page: 1, totalPages: 5, total: 47 } },
      { name: "Middle page", props: { page: 3, totalPages: 5, total: 47 } },
      { name: "Last page", props: { page: 5, totalPages: 5, total: 47 } },
    ],
    codeTemplate: `<Pagination page={currentPage} totalPages={totalPages} total={total} onPageChange={setPage} />`,
    migrated: true,
    libraryCandidate: true,
  });

  registerComponent({
    name: "MetadataTable",
    description: "Vertical list of label/value pairs with an optional section title.",
    category: "molecule",
    propDefs: [
      { name: "title", type: "string", defaultValue: "Details" },
    ],
    render: (props) => (
      <MetadataTable
        title={String(props.title) || undefined}
        rows={[
          { label: "ID", value: "01HXK9ZN4V8RPQD3" },
          { label: "Status", value: "in_progress" },
          { label: "Created", value: "2026-03-15T10:00:00Z" },
          { label: "Effort", value: "medium" },
        ]}
      />
    ),
    codeTemplate: `<MetadataTable title="Details" rows={[{ label: "ID", value: task.id }]} />`,
    migrated: true,
    libraryCandidate: true,
  });

  registerComponent({
    name: "DocumentSearchBar",
    description: "Search and filter bar for the documents list with title search, tag filter, folder filter, and favorites toggle.",
    category: "molecule",
    migrated: true,
    propDefs: [],
    render: () => <DocumentSearchBarDemo />,
    codeTemplate: `<DocumentSearchBar title={title} tag={tag} folder={folder} folders={folders} favorite={fav} onTitleChange={setTitle} onTagChange={setTag} onFolderChange={setFolder} onFavoriteChange={setFav} />`,
  });

  registerComponent({
    name: "TaskTableFilters",
    description: "Filter bar for the task table with search, status, category, effort, impact, and group key selects.",
    category: "molecule",
    propDefs: [],
    render: () => <TaskTableFiltersDemo />,
    codeTemplate: `<TaskTableFilters filter={filter} onChange={setFilter} groupKeys={["backend", "frontend"]} />`,
  });

  registerComponent({
    name: "FolderInput",
    description: "Text input with autocomplete dropdown for selecting or typing a folder name.",
    category: "molecule",
    propDefs: [],
    render: () => <FolderInputDemo />,
    codeTemplate: `<FolderInput value={folder} folders={knownFolders} onChange={setFolder} />`,
    migrated: true,
  });

  registerComponent({
    name: "AppThemePicker",
    description: "App-scoped theme picker showing only the 4 custom dark themes. Supports grid (card layout) and compact (dropdown) variants.",
    category: "molecule",
    propDefs: [
      { name: "variant", type: "enum", defaultValue: "grid", options: ["grid", "compact"] },
    ],
    render: (props) => (
      <AppThemePicker
        variant={props.variant as "grid" | "compact"}
        descriptions={{
          deepTeal: "Cool teals and warm accents",
          ember: "Warm amber tones",
          nord: "Arctic blue palette",
          synth: "Neon glow effects",
        }}
      />
    ),
    variants: [
      { name: "Grid", props: { variant: "grid" } },
      { name: "Compact", props: { variant: "compact" } },
    ],
    codeTemplate: `<AppThemePicker variant="grid" descriptions={{ deepTeal: "Cool teals" }} />`,
  });

  registerComponent({
    name: "SearchToggle",
    description: "Search input with keyword/semantic segmented toggle. Uses library tokens (t.*) with useTheme() retained only for glow effects.",
    category: "molecule",
    propDefs: [],
    render: () => {
      const [val, setVal] = useState("");
      const [sem, setSem] = useState(false);
      return <SearchToggle value={val} onChange={setVal} semantic={sem} onSemanticChange={setSem} />;
    },
    codeTemplate: `<SearchToggle value={query} onChange={setQuery} semantic={isSemantic} onSemanticChange={setIsSemantic} />`,
    migrated: true,
  });

  registerComponent({
    name: "DocumentReferenceCard",
    description: "Compact card showing a linked document reference with type badge, title, summary, and tags. Fully migrated to library tokens.",
    category: "molecule",
    propDefs: [],
    render: () => (
      <DocumentReferenceCard
        reference={{ document_id: "demo", type: "design", title: "Architecture Doc", summary: "High-level system design overview", favorite: false }}
        onOpen={() => {}}
        onDetach={() => {}}
      />
    ),
    codeTemplate: `<DocumentReferenceCard reference={ref} onOpen={handleOpen} onDetach={handleDetach} />`,
    migrated: true,
  });

  // =========================================================================
  // Organisms
  // =========================================================================

  registerComponent({
    name: "ModalShell",
    description: "Base modal container with overlay backdrop, centered content panel, and escape-to-close behavior.",
    category: "organism",
    propDefs: [],
    render: () => <ModalShellDemo />,
    codeTemplate: [
      '<ModalShell onClose={handleClose} maxWidth={480}>',
      '  <h2>Title</h2>',
      '  <p>Modal content</p>',
      '</ModalShell>',
    ].join("\n"),
    libraryCandidate: true,
  });

  registerComponent({
    name: "ConfirmDialog",
    description: "Destructive action confirmation modal with cancel and confirm buttons.",
    category: "organism",
    propDefs: [],
    render: () => <ConfirmDialogDemo />,
    codeTemplate: `<ConfirmDialog title="Delete item?" message="This cannot be undone." onConfirm={handleDelete} onCancel={handleCancel} />`,
    migrated: true,
  });

  registerComponent({
    name: "TopBar",
    description: "Application header with navigation tabs, optional breadcrumb, and trailing action slot.",
    category: "organism",
    propDefs: [],
    render: () => (
      <TopBar
        navItems={MOCK_NAV_ITEMS}
        activePath="/projects"
        onNavigate={() => {}}
        trailing={<ConnectionStatus connected={true} />}
      />
    ),
    variants: [
      { name: "With breadcrumb", props: {} },
    ],
    codeTemplate: `<TopBar navItems={navItems} activePath={location.pathname} onNavigate={navigate} trailing={<ConnectionStatus connected />} />`,
  });

  registerComponent({
    name: "ConnectionStatus",
    description: "WebSocket connection indicator dot that pulses when disconnected and ripples on reconnect.",
    category: "organism",
    propDefs: [
      { name: "connected", type: "boolean", defaultValue: true },
    ],
    render: (props) => <ConnectionStatus connected={props.connected as boolean} />,
    variants: [
      { name: "Connected", props: { connected: true } },
      { name: "Disconnected", props: { connected: false } },
    ],
    codeTemplate: `<ConnectionStatus connected={isConnected} />`,
  });

  registerComponent({
    name: "DisconnectionBanner",
    description: "Full-width danger banner shown after prolonged WebSocket disconnection (10s threshold).",
    category: "organism",
    propDefs: [
      { name: "connected", type: "boolean", defaultValue: false },
    ],
    render: (props) => {
      // The banner only shows after a 10s timeout when disconnected.
      // For the gallery, render a static preview of what it looks like.
      if (props.connected) {
        return <span style={{ color: "#888", fontSize: 12 }}>Banner hidden when connected</span>;
      }
      return (
        <DisconnectionBanner connected={false} />
      );
    },
    variants: [
      { name: "Connected (hidden)", props: { connected: true } },
      { name: "Disconnected", props: { connected: false } },
    ],
    codeTemplate: `<DisconnectionBanner connected={isConnected} />`,
    migrated: true,
  });

  registerComponent({
    name: "CreateEntityOverlay",
    description: "Generic modal form shell with title, scrollable content area, and cancel/submit footer. Used as the base for all create overlays.",
    category: "organism",
    propDefs: [],
    render: () => {
      return (
        <div style={{ position: "relative", border: "1px dashed #555", borderRadius: 8, padding: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
            CreateEntityOverlay renders as a modal. It is the base for CreateProjectOverlay, CreateTaskOverlay, and CreateDocumentOverlay.
          </p>
        </div>
      );
    },
    codeTemplate: [
      '<CreateEntityOverlay title="Create Item" onSubmit={handleSubmit} onClose={handleClose} loading={saving}>',
      '  <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />',
      '</CreateEntityOverlay>',
    ].join("\n"),
    migrated: true,
  });

  registerComponent({
    name: "CreateProjectOverlay",
    description: "Modal form for creating a new project with title and summary fields.",
    category: "organism",
    propDefs: [],
    render: () => (
      <div style={{ position: "relative", border: "1px dashed #555", borderRadius: 8, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          CreateProjectOverlay opens as a modal with Title and Summary inputs, plus Create/Cancel buttons.
        </p>
      </div>
    ),
    codeTemplate: `<CreateProjectOverlay onCreated={handleCreated} onClose={handleClose} />`,
    migrated: true,
  });

  registerComponent({
    name: "CreateTaskOverlay",
    description: "Modal form for creating a new task with title, summary, context, acceptance criteria, group key, and metadata selects.",
    category: "organism",
    propDefs: [],
    render: () => (
      <div style={{ position: "relative", border: "1px dashed #555", borderRadius: 8, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          CreateTaskOverlay opens as a modal with fields for title, summary, context, acceptance criteria, group key, status, effort, impact, and category.
        </p>
      </div>
    ),
    codeTemplate: `<CreateTaskOverlay onCreated={handleCreated} onClose={handleClose} />`,
    migrated: true,
  });

  registerComponent({
    name: "CreateDocumentOverlay",
    description: "Modal form for creating a new document with title, summary, markdown content, folder, and tag picker.",
    category: "organism",
    propDefs: [],
    render: () => (
      <div style={{ position: "relative", border: "1px dashed #555", borderRadius: 8, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          CreateDocumentOverlay opens as a modal with fields for title, summary, content (markdown), folder selection, and tag picker.
        </p>
      </div>
    ),
    codeTemplate: `<CreateDocumentOverlay folders={folders} onCreated={handleCreated} onClose={handleClose} />`,
  });

  registerComponent({
    name: "DocumentReaderModal",
    description: "Full-screen modal for reading and editing a document with markdown preview, metadata editing, tag management, and folder selection.",
    category: "organism",
    propDefs: [],
    render: () => (
      <div style={{ position: "relative", border: "1px dashed #555", borderRadius: 8, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          DocumentReaderModal opens as a large modal displaying document content with markdown rendering, inline editing, tag management, folder selection, and copy-to-clipboard.
        </p>
      </div>
    ),
    codeTemplate: `<DocumentReaderModal documentId={selectedDocId} onClose={handleClose} />`,
  });

  registerComponent({
    name: "DocumentReferencePicker",
    description: "Modal overlay for linking documents to an entity (project or task) with search, type selection, and merge-patch semantics.",
    category: "organism",
    propDefs: [],
    render: () => (
      <div style={{ position: "relative", border: "1px dashed #555", borderRadius: 8, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          DocumentReferencePicker opens as a modal with document search, already-linked section, available documents list, and reference type selection.
        </p>
      </div>
    ),
    codeTemplate: `<DocumentReferencePicker entityType="project" entityId={projectId} existingReferences={refs} onSave={handleSave} onClose={handleClose} />`,
  });

  registerComponent({
    name: "ShortcutHelpOverlay",
    description: "Modal displaying all registered keyboard shortcuts grouped by scope with styled key badges.",
    category: "organism",
    propDefs: [],
    render: () => (
      <div style={{ position: "relative", border: "1px dashed #555", borderRadius: 8, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          ShortcutHelpOverlay opens as a modal listing all keyboard shortcuts grouped by scope (Global, Projects, Documents, etc.) with styled key badges.
        </p>
      </div>
    ),
    codeTemplate: `<ShortcutHelpOverlay onClose={handleClose} />`,
  });

  registerComponent({
    name: "TaskTable",
    description: "Data table displaying tasks with columns for title, status (with inline status switcher), category, effort, impact, and delete action. Supports grouping by group_key.",
    category: "organism",
    propDefs: [],
    render: () => (
      <TaskTable
        tasks={MOCK_TASKS}
        selectedTaskId={null}
        onSelectTask={() => {}}
        onDeleteTask={() => {}}
        onUpdateTaskStatus={() => {}}
      />
    ),
    codeTemplate: `<TaskTable tasks={tasks} selectedTaskId={selectedId} onSelectTask={setSelected} onDeleteTask={handleDelete} onUpdateTaskStatus={handleStatusChange} />`,
  });

  registerComponent({
    name: "DocumentTable",
    description: "Magazine-style card grid for browsing documents. Shows title, summary, project chips, tags, and date on each card. Two columns on wide viewports, single column on narrow.",
    category: "organism",
    propDefs: [],
    render: () => (
      <DocumentTable
        documents={MOCK_DOCUMENTS}
        selectedDocumentId={null}
        onSelectDocument={() => {}}
        onDeleteDocument={() => {}}
        onToggleFavorite={() => {}}
      />
    ),
    codeTemplate: `<DocumentTable documents={docs} selectedDocumentId={selectedId} onSelectDocument={setSelected} onDeleteDocument={handleDelete} onToggleFavorite={handleFav} />`,
  });

  registerComponent({
    name: "ProjectDocumentTable",
    description: "Simplified document table for project detail views with detach (unlink) action instead of delete.",
    category: "organism",
    propDefs: [],
    render: () => (
      <ProjectDocumentTable
        documents={MOCK_DOCUMENTS.slice(0, 2)}
        selectedDocumentId={null}
        onSelectDocument={() => {}}
        onDetachDocument={() => {}}
        onToggleFavorite={() => {}}
      />
    ),
    codeTemplate: `<ProjectDocumentTable documents={docs} selectedDocumentId={selectedId} onSelectDocument={setSelected} onDetachDocument={handleDetach} onToggleFavorite={handleFav} />`,
  });

  registerComponent({
    name: "DependencyGraphView",
    description: "Force-directed graph visualization showing task dependencies with blocks/relates_to edges, hover highlighting, and cycle detection.",
    category: "organism",
    propDefs: [],
    render: () => (
      <div style={{ width: "100%", maxWidth: 700, overflow: "auto" }}>
        <DependencyGraphView
          tasks={MOCK_GRAPH_TASKS}
          edges={MOCK_GRAPH_EDGES}
          blockedTaskIds={["01G003"]}
          onTaskClick={() => {}}
        />
      </div>
    ),
    codeTemplate: `<DependencyGraphView tasks={graphTasks} edges={graphEdges} blockedTaskIds={blockedIds} onTaskClick={handleClick} />`,
  });

  // =========================================================================
  // Templates
  // =========================================================================

  registerComponent({
    name: "ListPageLayout",
    description: "Centered, max-width container for list pages with vertical padding and scroll support.",
    category: "template",
    propDefs: [],
    render: () => (
      <div style={{ border: "1px dashed #555", borderRadius: 8, height: 200, overflow: "hidden" }}>
        <ListPageLayout>
          <PageHeader title="Projects" subtitle="All your active projects" />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Card padding="md"><span>Project Alpha</span></Card>
            <Card padding="md"><span>Project Beta</span></Card>
          </div>
        </ListPageLayout>
      </div>
    ),
    codeTemplate: [
      '<ListPageLayout>',
      '  <PageHeader title="Projects" />',
      '  {/* list content */}',
      '</ListPageLayout>',
    ].join("\n"),
    migrated: true,
  });

  registerComponent({
    name: "DetailPageLayout",
    description: "Horizontally constrained container for detail/edit pages with optional expanded mode for wider content.",
    category: "template",
    propDefs: [
      { name: "expanded", type: "boolean", defaultValue: false },
    ],
    render: (props) => (
      <div style={{ border: "1px dashed #555", borderRadius: 8, height: 200, overflow: "hidden", display: "flex", justifyContent: "center" }}>
        <DetailPageLayout expanded={props.expanded as boolean}>
          <div style={{ flex: 1, padding: 16 }}>
            <h3 style={{ margin: 0 }}>Detail Content</h3>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#aaa" }}>
              {(props.expanded as boolean) ? "Expanded layout (max-width: 1800px)" : "Default layout (max-width: 900px)"}
            </p>
          </div>
        </DetailPageLayout>
      </div>
    ),
    variants: [
      { name: "Default", props: { expanded: false } },
      { name: "Expanded", props: { expanded: true } },
    ],
    codeTemplate: [
      '<DetailPageLayout expanded={showGraph}>',
      '  {/* detail panels */}',
      '</DetailPageLayout>',
    ].join("\n"),
  });
}
