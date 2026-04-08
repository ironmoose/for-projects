import type { ActivityLog } from "../entities";
import type { IActivityLogService, Paginated } from "../services";
import type { ActivityLogRepository } from "../repositories/activity-log";

export class ActivityLogService implements IActivityLogService {
  constructor(private repo: ActivityLogRepository) {}

  list(filter?: {
    entity_type?: string;
    entity_id?: string;
    limit?: number;
    offset?: number;
  }): Paginated<ActivityLog> {
    return {
      data: this.repo.findMany(filter),
      total: this.repo.count(filter),
    };
  }
}
