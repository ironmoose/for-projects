import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { type PgClient, createPgClient, initPgSchema, getDatabaseUrl, pgShutdown } from "./db/pg-connection";
import { migrateSqliteToPg } from "./db/sqlite-to-pg";
import { ProjectRepository } from "./repositories/sqlite/projects";
import { TaskRepository } from "./repositories/sqlite/tasks";
import { DocumentRepository } from "./repositories/sqlite/documents";
import { TagRepository } from "./repositories/sqlite/tags";
import { DocumentReferenceRepository } from "./repositories/sqlite/document-references";
import { TaskDependencyRepository } from "./repositories/sqlite/task-dependencies";
import { ActivityLogRepository } from "./repositories/sqlite/activity-log";
import { PgProjectRepository } from "./repositories/pg/projects";
import { PgTaskRepository } from "./repositories/pg/tasks";
import { PgDocumentRepository } from "./repositories/pg/documents";
import { PgTagRepository } from "./repositories/pg/tags";
import { PgDocumentReferenceRepository } from "./repositories/pg/document-references";
import { PgTaskDependencyRepository } from "./repositories/pg/task-dependencies";
import { PgActivityLogRepository } from "./repositories/pg/activity-log";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { TaskDependencyService } from "./services/task-dependencies";
import { DocumentReferenceService } from "./services/document-references";
import { DocumentService } from "./services/documents";
import { ActivityLogService } from "./services/activity-log";
import { ProjectContextService } from "./services/project-context";
import { EventBus } from "./events";
import type {
  IProjectService,
  ITaskService,
  ITaskDependencyService,
  IDocumentService,
  IDocumentReferenceService,
  IActivityLogService,
  ISourceService,
  IProjectContextService,
} from "./services";
import { createEmbeddingService, type EmbeddingService } from "./embedding";
import { startEmbeddingPipeline } from "./embedding-pipeline";
import { backfillEmbeddings } from "./embedding-backfill";
import { ConnectorRegistry, GitHubConnector } from "./connectors";
import { SourceService } from "./services/sources";

export interface AppContext {
  db: Database | null;
  pg: PgClient | null;
  backend: "sqlite" | "postgres";
  eventBus: EventBus;
  projectService: IProjectService;
  taskService: ITaskService;
  taskDependencyService: ITaskDependencyService;
  documentService: IDocumentService;
  documentReferenceService: IDocumentReferenceService;
  activityLogService: IActivityLogService;
  sourceService: ISourceService;
  projectContextService: IProjectContextService;
  shutdown: () => Promise<void>;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const databaseUrl = getDatabaseUrl();
  const eventBus = new EventBus();

  // DATABASE_URL wins when present (unless tests pass an explicit dbPath)
  if (databaseUrl && !dbPath) {
    return bootstrapPostgres(databaseUrl, eventBus);
  }
  return bootstrapSqlite(dbPath ?? process.env.SQLITE_PATH, eventBus);
}

async function bootstrapSqlite(dbPath: string | undefined, eventBus: EventBus): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const documentRepo = new DocumentRepository(db);
  const tagRepo = new TagRepository(db);
  const documentReferenceRepo = new DocumentReferenceRepository(db);
  const taskDependencyRepo = new TaskDependencyRepository(db);
  const activityLogRepo = new ActivityLogRepository(db);

  const documentReferenceService = new DocumentReferenceService(documentReferenceRepo, documentRepo, activityLogRepo, eventBus);
  const taskDependencyService = new TaskDependencyService(taskDependencyRepo, taskRepo, activityLogRepo, eventBus);
  const projectService = new ProjectService(projectRepo, activityLogRepo, eventBus, documentReferenceService);
  const taskService = new TaskService(taskRepo, projectRepo, activityLogRepo, eventBus, taskDependencyService, documentReferenceService);
  const documentService = new DocumentService(documentRepo, tagRepo, activityLogRepo, eventBus, documentReferenceRepo);
  const activityLogService = new ActivityLogService(activityLogRepo);

  const connectorRegistry = new ConnectorRegistry();
  connectorRegistry.register(new GitHubConnector());
  const sourceService = new SourceService(documentRepo, tagRepo, activityLogRepo, eventBus, connectorRegistry);

  const projectContextService = new ProjectContextService(projectService, taskService, taskDependencyService, documentService, activityLogService);

  const shutdown = async () => { db.close(); };

  console.log("[bootstrap] SQLite backend active");
  return { db, pg: null, backend: "sqlite", eventBus, projectService, taskService, taskDependencyService, documentService, documentReferenceService, activityLogService, sourceService, projectContextService, shutdown };
}

async function bootstrapPostgres(databaseUrl: string, eventBus: EventBus): Promise<AppContext> {
  const pg = createPgClient({ databaseUrl });
  await initPgSchema(pg);

  // Auto-migrate from SQLite if Postgres is empty and a SQLite DB exists
  const didMigrate = await autoMigrateFromSqlite(pg);

  const projectRepo = new PgProjectRepository(pg);
  const taskRepo = new PgTaskRepository(pg);
  const documentRepo = new PgDocumentRepository(pg);
  const tagRepo = new PgTagRepository(pg);
  const documentReferenceRepo = new PgDocumentReferenceRepository(pg);
  const taskDependencyRepo = new PgTaskDependencyRepository(pg);
  const activityLogRepo = new PgActivityLogRepository(pg);

  const documentReferenceService = new DocumentReferenceService(documentReferenceRepo, documentRepo, activityLogRepo, eventBus);
  const taskDependencyService = new TaskDependencyService(taskDependencyRepo, taskRepo, activityLogRepo, eventBus);
  const projectService = new ProjectService(projectRepo, activityLogRepo, eventBus, documentReferenceService);
  const taskService = new TaskService(taskRepo, projectRepo, activityLogRepo, eventBus, taskDependencyService, documentReferenceService);

  // Embeddings are opt-in: EMBEDDINGS_ENABLED=true (default: false)
  const embeddingsEnabled = process.env.EMBEDDINGS_ENABLED === "true";
  let embeddingService: EmbeddingService | undefined;
  let unsubEmbed: (() => void) | undefined;

  if (embeddingsEnabled) {
    embeddingService = createEmbeddingService();
    unsubEmbed = startEmbeddingPipeline({ sql: pg, eventBus, embeddingService });

    const healthy = await embeddingService.healthCheck();
    if (healthy) {
      console.log("[bootstrap] Embedding pipeline active (Ollama connected)");
    } else {
      console.log("[bootstrap] Embedding pipeline active (Ollama not yet reachable — embeddings will retry on each write)");
    }
  } else {
    console.log("[bootstrap] Embeddings disabled (set EMBEDDINGS_ENABLED=true to enable)");
  }

  const documentService = new DocumentService(documentRepo, tagRepo, activityLogRepo, eventBus, documentReferenceRepo, embeddingService);
  const activityLogService = new ActivityLogService(activityLogRepo);

  const connectorRegistry = new ConnectorRegistry();
  connectorRegistry.register(new GitHubConnector());
  const sourceService = new SourceService(documentRepo, tagRepo, activityLogRepo, eventBus, connectorRegistry);

  const projectContextService = new ProjectContextService(projectService, taskService, taskDependencyService, documentService, activityLogService);

  // Backfill embeddings for migrated data (fire-and-forget)
  if (didMigrate && embeddingsEnabled && embeddingService) {
    backfillEmbeddings(pg, embeddingService).catch((err: unknown) => {
      console.error("[bootstrap] Embedding backfill failed:", err);
    });
  }

  const shutdown = async () => {
    unsubEmbed?.();
    await pgShutdown(pg);
  };

  console.log("[bootstrap] Postgres backend active");
  return { db: null, pg, backend: "postgres", eventBus, projectService, taskService, taskDependencyService, documentService, documentReferenceService, activityLogService, sourceService, projectContextService, shutdown };
}

/**
 * Auto-migrate data from SQLite → Postgres on first Postgres startup.
 *
 * Runs only when:
 *   1. SQLITE_PATH is set and the file exists
 *   2. Postgres activity_log is empty (fresh database)
 *
 * This makes the transition from SQLite to Postgres seamless — start the app
 * with DATABASE_URL and your existing data comes along automatically.
 */
async function autoMigrateFromSqlite(pg: PgClient): Promise<boolean> {
  const sqlitePath = process.env.SQLITE_PATH;
  if (!sqlitePath || !existsSync(sqlitePath)) return false;

  // Check if Postgres already has data
  const [row] = await pg<{ count: string }[]>`SELECT COUNT(*) AS count FROM activity_log LIMIT 1`;
  if (Number(row.count) > 0) return false;

  console.log(`[bootstrap] Postgres is empty — auto-migrating from ${sqlitePath}`);

  const lite = new Database(sqlitePath, { readonly: true });
  lite.run("PRAGMA foreign_keys = OFF");

  try {
    const results = await migrateSqliteToPg(lite, pg);
    const total = results.reduce((sum, r) => sum + r.rows, 0);
    for (const r of results) {
      if (r.rows > 0) console.log(`[migrate]   ${r.table}: ${r.rows} rows`);
    }
    console.log(`[migrate] Done — ${total} total rows migrated`);
    return total > 0;
  } catch (err) {
    console.error("[migrate] Auto-migration failed:", err);
    console.error("[migrate] Postgres will start empty. Run the migration manually:");
    console.error(`[migrate]   bun scripts/migrate-sqlite-to-pg.ts --commit`);
    return false;
  } finally {
    lite.close();
  }
}
