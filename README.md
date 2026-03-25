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
| `SQLITE_PATH`        | `--sqlite-path` | `~/.tab/project-management/sqlite.db` | Full path to SQLite database |

CLI flags take precedence over environment variables.

```bash
tab-for-projects --port 8080 --sqlite-path /opt/tab-for-projects/data/sqlite.db
```

## Your data

All data is stored in a single file: `~/.tab/project-management/sqlite.db` by default.

**Back up** your data at any time:

```bash
sqlite3 ~/.tab/project-management/sqlite.db ".backup /path/to/backup.db"
```

**Start fresh** by deleting the database file and restarting. A new one is created automatically.

## API

tab-for-projects exposes a REST API alongside the web UI. All endpoints return JSON.

### Projects

```
GET    /api/projects          List all projects
POST   /api/projects          Create a project
GET    /api/projects/:slug    Get a project
PATCH  /api/projects/:slug    Update a project
DELETE /api/projects/:slug    Delete a project
```

**Create a project:**

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Redesign", "slug": "website-redesign", "description": "Q2 refresh"}'
```

**Response:**

```json
{
  "id": "01JABBCD1234EFGH5678IJKL",
  "name": "Website Redesign",
  "slug": "website-redesign",
  "description": "Q2 refresh",
  "status": "active",
  "created_at": "2026-03-23T12:00:00.000Z",
  "updated_at": "2026-03-23T12:00:00.000Z"
}
```

Project status can be `active`, `paused`, `completed`, or `archived`.

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

| Tool | Description |
|---|---|
| `list_projects` | List all projects |
| `get_project` | Get a project by its slug |
| `create_project` | Create a new project (name, slug, optional description/status) |
| `update_project` | Update a project's name, description, or status |
| `delete_project` | Delete a project by slug |
| `list_tasks` | List all tasks in a project |
| `create_task` | Create a task in a project (title, optional description/status) |
| `update_task` | Update a task's title, description, or status |
| `delete_task` | Delete a task by ID |

Task status values: `todo`, `in_progress`, `done`. Project status values: `active`, `paused`, `completed`, `archived`.

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
