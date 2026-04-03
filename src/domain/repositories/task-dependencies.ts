import type { Database } from "bun:sqlite";
import type { TaskDependency, TaskDependencyDetail, DependencyType } from "../entities";

export class TaskDependencyRepository {
  constructor(private db: Database) {}

  addDependencies(deps: { source_task_id: string; target_task_id: string; dependency_type: DependencyType }[]): TaskDependency[] {
    const stmt = this.db.query(
      "INSERT OR IGNORE INTO task_dependencies (source_task_id, target_task_id, dependency_type, created_at) VALUES (?, ?, ?, ?)"
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

  removeDependencies(pairs: { source_task_id: string; target_task_id: string }[]): void {
    const stmt = this.db.query(
      "DELETE FROM task_dependencies WHERE source_task_id = ? AND target_task_id = ?"
    );
    for (const pair of pairs) {
      stmt.run(pair.source_task_id, pair.target_task_id);
    }
  }

  getDependenciesFrom(taskId: string): TaskDependencyDetail[] {
    return this.db.query(
      `SELECT td.*, st.title AS source_task_title, st.status AS source_task_status, tt.title AS target_task_title, tt.status AS target_task_status
       FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       JOIN tasks tt ON tt.id = td.target_task_id
       WHERE td.source_task_id = ?
       ORDER BY td.created_at ASC`
    ).all(taskId) as TaskDependencyDetail[];
  }

  getDependenciesTo(taskId: string): TaskDependencyDetail[] {
    return this.db.query(
      `SELECT td.*, st.title AS source_task_title, st.status AS source_task_status, tt.title AS target_task_title, tt.status AS target_task_status
       FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       JOIN tasks tt ON tt.id = td.target_task_id
       WHERE td.target_task_id = ?
       ORDER BY td.created_at ASC`
    ).all(taskId) as TaskDependencyDetail[];
  }

  getGraphForProject(projectId: string): TaskDependency[] {
    return this.db.query(
      `SELECT td.*
       FROM task_dependencies td
       JOIN tasks st ON st.id = td.source_task_id
       WHERE st.project_id = ?
       ORDER BY td.created_at ASC`
    ).all(projectId) as TaskDependency[];
  }

  getBlockedTaskIds(projectId: string): string[] {
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
}
