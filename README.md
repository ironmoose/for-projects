# tab-pm

A self-contained project management tool. Install it, run it, and get a web UI and REST API with zero configuration.

All your data stays local in a single SQLite file — no external databases, no cloud accounts, no setup wizards.

## Quick start

```bash
# install bun (the only prerequisite)
curl -fsSL https://bun.sh/install | bash

# install tab-pm
bun install -g @alttab/project-management

# run it
tab-pm
```

Open `http://localhost:3000` and you're ready to go.

If `tab-pm` is not found, add bun's global bin directory to your PATH:

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Configuration

Everything works out of the box. If you need to customize, use environment variables or CLI flags:

| Environment variable | CLI flag        | Default                               | Description                          |
|----------------------|-----------------|---------------------------------------|--------------------------------------|
| `PM_PORT`            | `--port`        | `3000`                                | HTTP port (API + web UI)             |
| `PM_HOST`            | `--host`        | `127.0.0.1`                           | Bind address                         |
| `PM_MCP_PORT`        | `--mcp-port`    | `3001`                                | MCP server port                      |
| `SQLITE_PATH`        | `--sqlite-path` | `~/.tab/project-management/sqlite.db` | Full path to SQLite database         |

CLI flags take precedence over environment variables.

```bash
tab-pm --port 8080 --sqlite-path /opt/tab-pm/data/sqlite.db
```

## Your data

All data is stored in a single file: `~/.tab/project-management/sqlite.db` by default.

**Back up** your data at any time:

```bash
sqlite3 ~/.tab/project-management/sqlite.db ".backup /path/to/backup.db"
```

**Start fresh** by deleting the database file and restarting. A new one is created automatically.

## API

tab-pm exposes a REST API alongside the web UI. All endpoints return JSON.

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

### Health check

```
GET /api/health    Returns {"status": "ok"}
```

## MCP server

tab-pm includes a [Model Context Protocol](https://modelcontextprotocol.io) server, letting AI assistants manage your projects and tasks directly.

### How it works

The MCP server is built into `tab-pm` — it runs alongside the HTTP API and web UI in a single process. Two transports are available:

- **Stdio** — for local clients that spawn `tab-pm` directly (Claude Code, Claude Desktop, Cursor)
- **HTTP** — on a separate port (`3001` by default), for remote clients on the network

### Claude Code

```bash
claude mcp add tab-pm -- tab-pm
```

Or add it to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "tab-pm": {
      "command": "tab-pm"
    }
  }
}
```

### Claude Desktop

Open **Settings > Developer > Edit Config** and add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tab-pm": {
      "command": "tab-pm"
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Open **Settings > MCP Servers > Add new MCP server** and use:

- **Name:** `tab-pm`
- **Type:** `command`
- **Command:** `tab-pm`

### Remote access (MCP over HTTP)

The MCP server runs on its own port (`3001` by default). To make it accessible from the local network, bind to all interfaces:

```bash
tab-pm --host 0.0.0.0
```

Then from another machine, point your MCP client at the MCP server:

**Claude Code:**

```bash
claude mcp add tab-pm --transport http http://192.168.1.100:3001
```

**Claude Desktop / Cursor / other clients:**

```json
{
  "mcpServers": {
    "tab-pm": {
      "url": "http://192.168.1.100:3001"
    }
  }
}
```

Replace `192.168.1.100` with the host's actual IP address. To use a different port, pass `--mcp-port`.

### Custom database path

To point the MCP server at a specific database:

```json
{
  "mcpServers": {
    "tab-pm": {
      "command": "tab-pm",
      "args": ["--sqlite-path", "/path/to/your/sqlite.db"]
    }
  }
}
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

### Docker Compose

The repo includes a `docker-compose.yml` that runs the full stack: the Bun server, nginx reverse proxy, and built web assets.

```bash
# Start everything (builds on first run)
docker compose up --build

# Start in the background
docker compose up --build -d

# Stop
docker compose down
```

This gives you:
- **nginx** on port 80 — serves the web UI as static files, proxies `/api/` and `/mcp/` to the server
- **server** — Bun process running the API (3000) and MCP (3001) servers
- **SQLite** — persisted at `~/.tab/project-management/sqlite.db` (shared with local dev)

For **development** with Vite HMR (run `bun run dev` on the host first):

```bash
docker compose --profile dev up nginx-dev
```

### systemd (Linux)

```ini
# /etc/systemd/system/tab-pm.service
[Unit]
Description=tab-pm
After=network.target

[Service]
Type=simple
ExecStart=/home/pm/.bun/bin/tab-pm
Environment=PM_HOST=0.0.0.0
Environment=SQLITE_PATH=/var/lib/project-management/sqlite.db
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now tab-pm
```

### launchd (macOS)

```xml
<!-- ~/Library/LaunchAgents/com.alttab.tab-pm.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.alttab.tab-pm</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/you/.bun/bin/tab-pm</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.alttab.tab-pm.plist
```

### Reverse proxy with local DNS

The repo includes a Docker Compose stack that runs an nginx reverse proxy and a DNS server (dnsmasq). This lets everyone on your local network access tab-pm through clean URLs — no `/etc/hosts` editing required on each machine.

**Architecture:**

```
┌─ local network ──────────────────────────────────────────┐
│                                                          │
│  Other machines ──DNS (port 53)──► dnsmasq container     │
│       │                            resolves *.pm.local   │
│       │                            to host LAN IP        │
│       │                                                  │
│       └──HTTP (port 80)──► nginx container               │
│                             ├─ pm.local     → :3000      │
│                             ├─ api.pm.local → :3000      │
│                             └─ mcp.pm.local → :3001      │
│                                     │                    │
│                              host.docker.internal        │
│                                     │                    │
│                              tab-pm (127.0.0.1)          │
│                              ├─ API + web UI  :3000      │
│                              └─ MCP server    :3001      │
└──────────────────────────────────────────────────────────┘
```

Only ports 80 (HTTP) and 53 (DNS) are exposed to the network. tab-pm itself binds to `127.0.0.1` and is not directly reachable from other machines.

**Domains:**

| Domain | Routes to |
|--------|-----------|
| `pm.local` | Web UI + API (port 3000) |
| `api.pm.local` | API (port 3000) |
| `mcp.pm.local` | MCP server (port 3001), with SSE streaming support |

**Setup:**

1. Set your machine's LAN IP in the dnsmasq config:

   ```bash
   sed -i '' "s/192.168.1.100/$(ipconfig getifaddr en0)/" dns/dnsmasq.conf
   ```

2. Start the proxy and DNS containers:

   ```bash
   docker compose up -d
   ```

3. Start tab-pm:

   ```bash
   tab-pm
   ```

4. Point other machines on the network to use this machine as their DNS server. You can do this per-device or once in your router's DHCP settings to apply it network-wide:

   - **macOS**: System Settings > Wi-Fi > Details > DNS
   - **Linux**: NetworkManager or `/etc/resolv.conf`
   - **Windows**: Adapter settings > IPv4 > Preferred DNS server
   - **Router (recommended)**: Set the primary DNS server in your router's DHCP config

**Verify DNS is working** from another machine:

```bash
nslookup pm.local <host-ip>
```

**MCP clients** can connect through the proxy:

```bash
claude mcp add tab-pm --transport http http://mcp.pm.local
```

Or in a client config file:

```json
{
  "mcpServers": {
    "tab-pm": {
      "url": "http://mcp.pm.local"
    }
  }
}
```

**Configuration files:**

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Full stack: server, nginx, web assets, dnsmasq |
| `Dockerfile` | Multi-stage build for server and web assets |
| `nginx/nginx.conf` | Production config — static files + reverse proxy |
| `nginx/nginx.dev.conf` | Development config — proxies to Vite dev server |
| `dns/dnsmasq.conf` | Wildcard DNS resolution for `*.pm.local` |

## Upgrading

```bash
bun install -g @alttab/project-management@latest
```

Restart the server after upgrading. Database migrations run automatically — your data is preserved.

## Contributing

tab-pm is built with TypeScript, Bun, Hono, and React. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and architecture details.

## License

MIT
