import type { Tag, Task } from "../entities";
import type { ITagService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { TagRepository } from "../repositories/tags";
import type { TaskRepository } from "../repositories/tasks";

export class TagService implements ITagService {
  constructor(
    private tagRepo: TagRepository,
    private taskRepo: TaskRepository,
  ) {}

  findAll(limit = 100, offset = 0): Paginated<Tag> {
    return {
      data: this.tagRepo.findAll(limit, offset),
      total: this.tagRepo.count(),
    };
  }

  findByName(name: string): Tag | null {
    return this.tagRepo.findByName(name);
  }

  create(name: string): Tag {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      throw new ServiceError("tag name is required", 400);
    }
    if (trimmed.length > 50) {
      throw new ServiceError("tag name must be 50 characters or fewer", 400);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) {
      throw new ServiceError("tag name must be lowercase alphanumeric with hyphens", 400);
    }
    const existing = this.tagRepo.findByName(trimmed);
    if (existing) {
      throw new ServiceError("tag already exists", 409);
    }
    return this.tagRepo.create(trimmed);
  }

  delete(id: string): boolean {
    return this.tagRepo.delete(id);
  }

  addTagToTask(taskId: string, tagName: string): Tag {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new ServiceError("task not found", 404);
    }
    const trimmed = tagName.trim().toLowerCase();
    // Auto-create tag if it doesn't exist
    let tag = this.tagRepo.findByName(trimmed);
    if (!tag) {
      if (!trimmed || trimmed.length > 50) {
        throw new ServiceError("tag name must be 1-50 lowercase alphanumeric characters with hyphens", 400);
      }
      if (!/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) {
        throw new ServiceError("tag name must be lowercase alphanumeric with hyphens", 400);
      }
      tag = this.tagRepo.create(trimmed);
    }
    this.tagRepo.addTagToTask(taskId, tag.id);
    return tag;
  }

  removeTagFromTask(taskId: string, tagId: string): boolean {
    return this.tagRepo.removeTagFromTask(taskId, tagId);
  }

  getTagsForTask(taskId: string): Tag[] {
    return this.tagRepo.getTagsForTask(taskId);
  }

  findTasksByTag(tagName: string, limit = 100, offset = 0): Paginated<Task> {
    const tag = this.tagRepo.findByName(tagName);
    if (!tag) {
      throw new ServiceError("tag not found", 404);
    }
    return {
      data: this.tagRepo.findTasksByTag(tag.id, limit, offset),
      total: this.tagRepo.countTasksByTag(tag.id),
    };
  }
}
