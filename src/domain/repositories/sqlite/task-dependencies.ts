import type { Database } from "bun:sqlite";
import type { TaskDependency, TaskDependencyDetail, DependencyType } from "../../entities";

export class TaskDependencyRepository {
  constructor(private db: Database) {}

  async addDependencies(deps: { source_task_id: string; target_task_id: string; dependency_type: DependencyType }[]): Promise<TaskDependency[]> {
    const stmt = this.db.query(
      `INSERT INTO task_dependencies (source_task_id, target_task_id, dependency_type, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(source_task_id, target_task_id) DO UPDATE SET dependency_type = excluded.dependency_type, created_at = excluded.created_at`
    );
    const now = new Date().toISOString();
    for (const dep of deps) {
      stmt.run(dep.source_task_id, dep.target_task_id, dep.dependency_type, now);
    }
    return deps.map((dep) => {
      const row = this.db.query(
        "SELECT * FROM task_dependencies WHERE source_task_id = ? AND target_task_id = ?"
      ).get(dep.source_task_id, dep.target_task_id) as TaskDependency | null;
      return row!;
    });
  }

  async removeDependencies(pairs: { source_task_id: string; target_task_id: string }[]): Promise<void> {
    const stmt = this.db.query(
      "DELETE FROM task_dependencies WHERE source_task_id = ? AND target_task_id = ?"
    );
    for (const pair of pairs) {
      stmt.run(pair.source_task_id, pair.target_task_id);
    }
  }

  async getDependenciesFrom(taskId: string): Promise<TaskDependencyDetail[]> {
    return this.db.query(
      `SELECT td.*, st.title AS source_task_title, st.status AS source_task_status, tt.title AS target_task_title, tt.status AS target_task_status
       FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       JOIN tasks tt ON tt.id = td.target_task_id
       WHERE td.source_task_id = ?
       ORDER BY td.created_at ASC`
    ).all(taskId) as TaskDependencyDetail[];
  }

  async getDependenciesTo(taskId: string): Promise<TaskDependencyDetail[]> {
    return this.db.query(
      `SELECT td.*, st.title AS source_task_title, st.status AS source_task_status, tt.title AS target_task_title, tt.status AS target_task_status
       FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       JOIN tasks tt ON tt.id = td.target_task_id
       WHERE td.target_task_id = ?
       ORDER BY td.created_at ASC`
    ).all(taskId) as TaskDependencyDetail[];
  }

  async getGraphForProject(projectId: string): Promise<TaskDependency[]> {
    return this.db.query(
      `SELECT td.*
       FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       WHERE st.project_id = ?
       ORDER BY td.created_at ASC`
    ).all(projectId) as TaskDependency[];
  }

  async getBlockedTaskIds(projectId: string): Promise<string[]> {
    const rows = this.db.query(
      `SELECT DISTINCT td.target_task_id
       FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       JOIN tasks tt ON tt.id = td.target_task_id
       WHERE st.project_id = ?
         AND td.dependency_type = 'blocks'
         AND st.status NOT IN ('done', 'archived')`
    ).all(projectId) as { target_task_id: string }[];
    return rows.map((r) => r.target_task_id);
  }

  async isTaskBlocked(taskId: string): Promise<boolean> {
    const row = this.db.query(
      `SELECT 1 FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       WHERE td.target_task_id = ?
         AND td.dependency_type = 'blocks'
         AND st.status NOT IN ('done', 'archived')
       LIMIT 1`
    ).get(taskId) as Record<string, number> | null;
    return row !== null;
  }
}
