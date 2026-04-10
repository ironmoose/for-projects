import type { Sql } from "postgres";
import type { TaskDependency, TaskDependencyDetail, DependencyType } from "../../entities";

export class PgTaskDependencyRepository {
  constructor(private sql: Sql) {}

  async addDependencies(deps: { source_task_id: string; target_task_id: string; dependency_type: DependencyType }[]): Promise<TaskDependency[]> {
    const now = new Date().toISOString();
    const results: TaskDependency[] = [];

    for (const dep of deps) {
      await this.sql`
        INSERT INTO task_dependencies (source_task_id, target_task_id, dependency_type, created_at)
        VALUES (${dep.source_task_id}, ${dep.target_task_id}, ${dep.dependency_type}, ${now})
        ON CONFLICT (source_task_id, target_task_id)
        DO UPDATE SET dependency_type = EXCLUDED.dependency_type, created_at = EXCLUDED.created_at
      `;
      const rows = await this.sql<TaskDependency[]>`
        SELECT * FROM task_dependencies
        WHERE source_task_id = ${dep.source_task_id} AND target_task_id = ${dep.target_task_id}
      `;
      results.push(rows[0]);
    }
    return results;
  }

  async removeDependencies(pairs: { source_task_id: string; target_task_id: string }[]): Promise<void> {
    for (const pair of pairs) {
      await this.sql`
        DELETE FROM task_dependencies
        WHERE source_task_id = ${pair.source_task_id} AND target_task_id = ${pair.target_task_id}
      `;
    }
  }

  async getDependenciesFrom(taskId: string): Promise<TaskDependencyDetail[]> {
    return this.sql<TaskDependencyDetail[]>`
      SELECT td.*, st.title AS source_task_title, st.status AS source_task_status,
        tt.title AS target_task_title, tt.status AS target_task_status
      FROM task_dependencies td
      JOIN tasks st ON st.id = td.source_task_id
      JOIN tasks tt ON tt.id = td.target_task_id
      WHERE td.source_task_id = ${taskId}
      ORDER BY td.created_at ASC
    `;
  }

  async getDependenciesTo(taskId: string): Promise<TaskDependencyDetail[]> {
    return this.sql<TaskDependencyDetail[]>`
      SELECT td.*, st.title AS source_task_title, st.status AS source_task_status,
        tt.title AS target_task_title, tt.status AS target_task_status
      FROM task_dependencies td
      JOIN tasks st ON st.id = td.source_task_id
      JOIN tasks tt ON tt.id = td.target_task_id
      WHERE td.target_task_id = ${taskId}
      ORDER BY td.created_at ASC
    `;
  }

  async getGraphForProject(projectId: string): Promise<TaskDependency[]> {
    return this.sql<TaskDependency[]>`
      SELECT td.* FROM task_dependencies td
      JOIN tasks st ON st.id = td.source_task_id
      WHERE st.project_id = ${projectId}
      ORDER BY td.created_at ASC
    `;
  }

  async getBlockedTaskIds(projectId: string): Promise<string[]> {
    const rows = await this.sql<{ target_task_id: string }[]>`
      SELECT DISTINCT td.target_task_id FROM task_dependencies td
      JOIN tasks st ON st.id = td.source_task_id
      JOIN tasks tt ON tt.id = td.target_task_id
      WHERE st.project_id = ${projectId}
        AND td.dependency_type = 'blocks'
        AND st.status NOT IN ('done', 'archived')
    `;
    return rows.map((r) => r.target_task_id);
  }

  async isTaskBlocked(taskId: string): Promise<boolean> {
    const rows = await this.sql<{ n: number }[]>`
      SELECT 1 as n FROM task_dependencies td
      JOIN tasks st ON st.id = td.source_task_id
      WHERE td.target_task_id = ${taskId}
        AND td.dependency_type = 'blocks'
        AND st.status NOT IN ('done', 'archived')
      LIMIT 1
    `;
    return rows.length > 0;
  }
}
