import type { ActivityLog } from "../entities";
import type { IActivityLogService, Paginated } from "../services";
import type { IActivityLogRepository } from "../repositories/interfaces";

export class ActivityLogService implements IActivityLogService {
  constructor(private repo: IActivityLogRepository) {}

  async list(filter?: {
    entity_type?: string;
    entity_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Paginated<ActivityLog>> {
    return {
      data: await this.repo.findMany(filter),
      total: await this.repo.count(filter),
    };
  }
}
