# tab-for-projects

A self-contained project management tool. Install it, run it, and get a web UI and REST API with zero configuration.

All your data stays local in a single SQLite file — no external databases, no cloud accounts, no setup wizards.

## Quick start

```bash
# install bun (the only prerequisite)
curl -fsSL https://bun.sh/install | bash

# install tab-for-projects
bun install -g @x4lt7ab/tab-for-projects

# run it
tab-for-projects
```

Open `http://localhost:3000` and you're ready to go.

If `tab-for-projects` is not found, add bun's global bin directory to your PATH:

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Configuration

Everything works out of the box. If you need to customize, use environment variables or CLI flags:

| Environment variable | CLI flag        | Default                               | Description                  |
|----------------------|-----------------|---------------------------------------|------------------------------|
| `PM_PORT`            | `--port`        | `3000`                                | HTTP port                    |
| `PM_HOST`            | `--host`        | `127.0.0.1`                           | Bind address                 |
| `SQLITE_PATH`        | `--sqlite-path` | *(required)*                          | Full path to SQLite database |

CLI flags take precedence over environment variables.

```bash
tab-for-projects --port 8080 --sqlite-path /opt/tab-for-projects/data/sqlite.db
```

## Your data

All data is stored in a single SQLite file at the path you specify via `SQLITE_PATH`.

**Back up** your data at any time:

```bash
sqlite3 /path/to/your/sqlite.db ".backup /path/to/backup.db"
```

**Start fresh** by deleting the database file and restarting. A new one is created automatically.

## API

tab-for-projects exposes a REST API alongside the web UI. All endpoints return JSON.

### Projects

```
GET    /api/projects          List all projects
POST   /api/projects          Create a project
GET    /api/projects/:id      Get a project
PATCH  /api/projects/:id      Update a project
DELETE /api/projects/:id      Delete a project
```

**Create a project:**

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Redesign", "description": "Q2 refresh"}'
```

**Response:**

```json
{
  "id": "01JABBCD1234EFGH5678IJKL",
  "name": "Website Redesign",
  "description": "Q2 refresh",
  "status": "active",
  "created_at": "2026-03-23T12:00:00.000Z",
  "updated_at": "2026-03-23T12:00:00.000Z"
}
```

Project status can be `active`, `paused`, `completed`, or `archived`.

### Tasks

```
GET    /api/projects/:id/tasks                List tasks (paginated, filterable)
GET    /api/projects/:id/tasks/by-number/:n   Get a task by project-scoped number
POST   /api/projects/:id/tasks                Create a task
PATCH  /api/projects/:id/tasks/:id            Update a task
DELETE /api/projects/:id/tasks/:id            Delete a task
```

**Create a task:**

```bash
curl -X POST http://localhost:3000/api/projects/01JABBCD1234EFGH5678IJKL/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Design homepage hero", "description": "## Requirements\n\n- Full-bleed image\n- CTA button", "type": "design", "effort": "moderate"}'
```

**Response:**

```json
{
  "id": "01JABBCD1234EFGH5678IJKL",
  "number": 1,
  "title": "Design homepage hero",
  "description": "## Requirements\n\n- Full-bleed image\n- CTA button",
  "status": "todo",
  "type": "design",
  "effort": "moderate",
  "priority": null,
  "created_at": "2026-03-25T12:00:00.000Z",
  "updated_at": "2026-03-25T12:00:00.000Z"
}
```

**Task fields:**

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Required. 1–500 characters. |
| `description` | string | Optional. Up to 10,000 characters. Supports [Markdown](#markdown-in-descriptions). |
| `status` | string | `todo`, `in_progress`, or `done`. Default: `todo`. |
| `type` | string \| null | `research`, `implementation`, `review`, `design`, `planning`, `testing`, or `documentation`. |
| `effort` | string \| null | `trivial`, `low`, `moderate`, `high`, or `extreme`. |
| `priority` | integer \| null | 1–10. |

**Filtering tasks:**

The list endpoint accepts query parameters to filter and paginate results:

| Parameter | Description |
|-----------|-------------|
| `status` | Filter by task status |
| `type` | Filter by task type |
| `effort` | Filter by effort level |
| `tag` | Filter by exact tag name |
| `tag_prefix` | Filter by tag prefix (e.g., `agent` matches `agent:researcher`) |
| `limit` | Results per page (1–500, default 100) |
| `offset` | Pagination offset (default 0) |

```bash
curl "http://localhost:3000/api/projects/01JABBCD1234EFGH5678IJKL/tasks?status=todo&type=design&limit=25"
```

### Tags

Tags are labels you can attach to tasks. Tag names are lowercase alphanumeric with hyphens and colons as namespace separators (e.g., `frontend`, `agent:researcher`, `priority:high`).

```
GET    /api/tags                          List all tags (filterable by prefix)
POST   /api/tags                          Create a tag
DELETE /api/tags/:id                      Delete a tag
GET    /api/tags/:name/tasks              Find tasks by exact tag (cross-project)
GET    /api/tags/prefix/:prefix/tasks     Find tasks by tag prefix (cross-project)
GET    /api/projects/:id/tasks/:id/tags Get tags for a task
POST   /api/projects/:id/tasks/:id/tags Add a tag to a task (auto-creates if needed)
DELETE /api/projects/:id/tasks/:id/tags/:tagId  Remove a tag from a task
```

**Add a tag to a task:**

```bash
curl -X POST http://localhost:3000/api/projects/01JABBCD1234EFGH5678IJKL/tasks/01JABBCE5678MNOP9012QRST/tags \
  -H "Content-Type: application/json" \
  -d '{"name": "frontend"}'
```

### Markdown in descriptions

Task descriptions support [GitHub Flavored Markdown](https://github.github.com/gfm/) (GFM). The web UI renders descriptions with full styling — headings, lists, tables, code blocks with syntax highlighting, blockquotes, links, and emphasis.

Markdown is stored as-is and rendered client-side. The API accepts and returns raw Markdown strings.

**Supported syntax:**

- Headings (`#`, `##`, `###`)
- Bold, italic, strikethrough
- Ordered and unordered lists (including nested)
- Task lists (`- [x]`, `- [ ]`)
- Fenced code blocks with language hints
- Inline code
- Tables (GFM)
- Blockquotes
- Links (open in new tab)
- Horizontal rules

### Health check

```
GET /api/health    Returns {"status": "ok"}
```

## MCP server

tab-for-projects includes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/mcp`, letting AI assistants manage your projects and tasks directly.

The MCP endpoint is served on the same port as the API and web UI — no separate process needed.

### Claude Code

```bash
claude mcp add tab-for-projects --transport http http://localhost:3000/mcp
```

Or add it to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "tab-for-projects": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Claude Desktop

Open **Settings > Developer > Edit Config** and add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tab-for-projects": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Open **Settings > MCP Servers > Add new MCP server** and use:

- **Name:** `tab-for-projects`
- **Type:** `url`
- **URL:** `http://localhost:3000/mcp`

### Remote access

To make tab-for-projects accessible from the local network, bind to all interfaces:

```bash
tab-for-projects --host 0.0.0.0
```

Then from another machine, point your MCP client at the server:

```bash
claude mcp add tab-for-projects --transport http http://192.168.1.100:3000/mcp
```

Replace `192.168.1.100` with the host's actual IP address.

### Custom database path

```json
{
  "mcpServers": {
    "tab-for-projects": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Start the server with a custom database path:

```bash
tab-for-projects --sqlite-path /path/to/your/sqlite.db
```

### Available tools

**Projects**

| Tool | Description |
|---|---|
| `list_projects` | List all projects |
| `get_project` | Get a project by ID |
| `create_project` | Create a new project (name, optional description/status) |
| `update_project` | Update a project's name, description, or status |
| `delete_project` | Delete a project by ID |

**Tasks**

| Tool | Description |
|---|---|
| `list_tasks` | List tasks in a project (filterable by status, type, effort, tag, tag prefix) |
| `get_task_by_number` | Get a task by its project-scoped number |
| `create_task` | Create a task (title, optional description/status/type/effort/priority) |
| `update_task` | Update a task's fields (supports type, effort, priority — pass null to clear) |
| `delete_task` | Delete a task by ID |

**Tags**

| Tool | Description |
|---|---|
| `list_tags` | List all tags (filterable by prefix) |
| `create_tag` | Create a tag (lowercase alphanumeric, hyphens, colons) |
| `delete_tag` | Delete a tag by ID |
| `add_tag_to_task` | Add a tag to a task (auto-creates if tag doesn't exist) |
| `remove_tag_from_task` | Remove a tag from a task |
| `get_task_tags` | Get all tags for a task |
| `find_tasks_by_tag` | Find tasks with a given tag (cross-project) |

Task descriptions support Markdown (GFM) — see [Markdown in descriptions](#markdown-in-descriptions).

Task status: `todo`, `in_progress`, `done`. Task type: `research`, `implementation`, `review`, `design`, `planning`, `testing`, `documentation`. Task effort: `trivial`, `low`, `moderate`, `high`, `extreme`. Priority: 1–10. Project status: `active`, `paused`, `completed`, `archived`.

## Deploying

### systemd (Linux)

```ini
# /etc/systemd/system/tab-for-projects.service
[Unit]
Description=tab-for-projects
After=network.target

[Service]
Type=simple
ExecStart=/home/pm/.bun/bin/tab-for-projects
Environment=PM_HOST=0.0.0.0
Environment=SQLITE_PATH=/var/lib/project-management/sqlite.db
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now tab-for-projects
```

### launchd (macOS)

```xml
<!-- ~/Library/LaunchAgents/com.alttab.tab-for-projects.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.alttab.tab-for-projects</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/you/.bun/bin/tab-for-projects</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SQLITE_PATH</key>
    <string>/Users/you/.tab/project-management/sqlite.db</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.alttab.tab-for-projects.plist
```

## Upgrading

```bash
bun install -g @x4lt7ab/tab-for-projects@latest
```

Restart the server after upgrading. Database migrations run automatically — your data is preserved.

## Contributing

tab-for-projects is built with TypeScript, Bun, Hono, and React. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and architecture details.

## License

MIT
