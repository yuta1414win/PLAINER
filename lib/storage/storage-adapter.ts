import { Project } from '@/lib/types';

export interface StorageAdapter {
  // Core operations
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;

  // Project-specific operations
  saveProject(project: Project): Promise<void>;
  loadProject(projectId: string): Promise<Project | null>;
  getAllProjects(): Promise<Project[]>;
  deleteProject(projectId: string): Promise<void>;

  // Utility operations
  exists(key: string): Promise<boolean>;
  getSize(): Promise<number>;
  getKeys(): Promise<string[]>;
}

// LocalStorage adapter as fallback
export class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'plainer_';

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async save(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(this.getFullKey(key), JSON.stringify(data));
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        // Try to clear old data
        this.clearOldData();
        localStorage.setItem(this.getFullKey(key), JSON.stringify(data));
      }
      throw error;
    }
  }

  async load(key: string): Promise<any> {
    const item = localStorage.getItem(this.getFullKey(key));
    return item ? JSON.parse(item) : null;
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.getFullKey(key));
  }

  async clear(): Promise<void> {
    const keys = await this.getKeys();
    keys.forEach((key) => localStorage.removeItem(this.getFullKey(key)));
  }

  async saveProject(project: Project): Promise<void> {
    await this.save(`project_${project.id}`, project);

    // Update project index
    const projectIds = (await this.load('project_index')) || [];
    if (!projectIds.includes(project.id)) {
      projectIds.push(project.id);
      await this.save('project_index', projectIds);
    }
  }

  async loadProject(projectId: string): Promise<Project | null> {
    return await this.load(`project_${projectId}`);
  }

  async getAllProjects(): Promise<Project[]> {
    const projectIds = (await this.load('project_index')) || [];
    const projects: Project[] = [];

    for (const id of projectIds) {
      const project = await this.loadProject(id);
      if (project) {
        projects.push(project);
      }
    }

    return projects;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.remove(`project_${projectId}`);

    // Update project index
    const projectIds = (await this.load('project_index')) || [];
    const filteredIds = projectIds.filter((id: string) => id !== projectId);
    await this.save('project_index', filteredIds);
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(this.getFullKey(key)) !== null;
  }

  async getSize(): Promise<number> {
    let size = 0;
    const keys = await this.getKeys();

    for (const key of keys) {
      const item = localStorage.getItem(this.getFullKey(key));
      if (item) {
        size += item.length;
      }
    }

    return size;
  }

  async getKeys(): Promise<string[]> {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }

    return keys;
  }

  private clearOldData(): void {
    const projectIds = JSON.parse(
      localStorage.getItem(`${this.prefix}project_index`) || '[]'
    );
    const projects: Array<{ id: string; updatedAt: number }> = [];

    // Get all projects with their update times
    for (const id of projectIds) {
      const project = localStorage.getItem(`${this.prefix}project_${id}`);
      if (project) {
        const parsed = JSON.parse(project);
        projects.push({
          id: parsed.id,
          updatedAt: new Date(parsed.updatedAt).getTime(),
        });
      }
    }

    // Sort by update time (oldest first)
    projects.sort((a, b) => a.updatedAt - b.updatedAt);

    // Remove oldest projects (keep last 5)
    const toRemove = projects.slice(0, Math.max(0, projects.length - 5));
    for (const project of toRemove) {
      localStorage.removeItem(`${this.prefix}project_${project.id}`);
    }
  }
}

// Memory storage for testing
export class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, any>();

  async save(key: string, data: any): Promise<void> {
    this.storage.set(key, data);
  }

  async load(key: string): Promise<any> {
    return this.storage.get(key) || null;
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async saveProject(project: Project): Promise<void> {
    await this.save(`project_${project.id}`, project);

    const projectIds = (await this.load('project_index')) || [];
    if (!projectIds.includes(project.id)) {
      projectIds.push(project.id);
      await this.save('project_index', projectIds);
    }
  }

  async loadProject(projectId: string): Promise<Project | null> {
    return await this.load(`project_${projectId}`);
  }

  async getAllProjects(): Promise<Project[]> {
    const projectIds = (await this.load('project_index')) || [];
    const projects: Project[] = [];

    for (const id of projectIds) {
      const project = await this.loadProject(id);
      if (project) {
        projects.push(project);
      }
    }

    return projects;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.remove(`project_${projectId}`);

    const projectIds = (await this.load('project_index')) || [];
    const filteredIds = projectIds.filter((id: string) => id !== projectId);
    await this.save('project_index', filteredIds);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async getSize(): Promise<number> {
    let size = 0;

    for (const [, value] of this.storage) {
      size += JSON.stringify(value).length;
    }

    return size;
  }

  async getKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}
