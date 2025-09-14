import { Project, Step } from '@/lib/types';

interface StorageMetadata {
  id: string;
  name: string;
  thumbnail?: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  version: string;
  isAutoSave?: boolean;
}

export interface ProjectWithMetadata extends Project {
  metadata: StorageMetadata;
}

const DB_NAME = 'PLAINER_DB';
const DB_VERSION = 2;
const PROJECTS_STORE = 'projects';
const METADATA_STORE = 'metadata';
const AUTOSAVE_STORE = 'autosaves';
const SETTINGS_STORE = 'settings';

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectStore = db.createObjectStore(PROJECTS_STORE, {
            keyPath: 'id',
          });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, {
            keyPath: 'id',
          });
          metadataStore.createIndex('projectId', 'projectId', { unique: true });
          metadataStore.createIndex('lastAccessedAt', 'lastAccessedAt', {
            unique: false,
          });
        }

        // Autosave store
        if (!db.objectStoreNames.contains(AUTOSAVE_STORE)) {
          const autosaveStore = db.createObjectStore(AUTOSAVE_STORE, {
            keyPath: 'id',
          });
          autosaveStore.createIndex('projectId', 'projectId', {
            unique: false,
          });
          autosaveStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
        }

        // Settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
  }

  // Project CRUD operations
  async saveProject(project: Project): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(
      [PROJECTS_STORE, METADATA_STORE],
      'readwrite'
    );

    const projectStore = transaction.objectStore(PROJECTS_STORE);
    const metadataStore = transaction.objectStore(METADATA_STORE);

    // Calculate project size
    const projectSize = new Blob([JSON.stringify(project)]).size;

    // Generate thumbnail from first step
    const thumbnail = project.steps[0]?.thumbnail;

    // Save project
    await this.promisifyRequest(projectStore.put(project));

    // Save or update metadata
    const metadata: StorageMetadata = {
      id: `meta-${project.id}`,
      name: project.name,
      thumbnail,
      size: projectSize,
      createdAt: project.createdAt || new Date(),
      updatedAt: project.updatedAt || new Date(),
      lastAccessedAt: new Date(),
      version: '1.0.0',
    };

    await this.promisifyRequest(metadataStore.put(metadata));
  }

  async loadProject(projectId: string): Promise<ProjectWithMetadata | null> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(
      [PROJECTS_STORE, METADATA_STORE],
      'readonly'
    );

    const projectStore = transaction.objectStore(PROJECTS_STORE);
    const metadataStore = transaction.objectStore(METADATA_STORE);

    const project = await this.promisifyRequest<Project>(
      projectStore.get(projectId)
    );

    if (!project) return null;

    const metadataIndex = metadataStore.index('projectId');
    const metadata = await this.promisifyRequest<StorageMetadata>(
      metadataIndex.get(projectId)
    );

    // Update last accessed time
    if (metadata) {
      metadata.lastAccessedAt = new Date();
      const updateTransaction = this.db!.transaction(
        [METADATA_STORE],
        'readwrite'
      );
      await this.promisifyRequest(
        updateTransaction.objectStore(METADATA_STORE).put(metadata)
      );
    }

    return {
      ...project,
      metadata: metadata || this.createDefaultMetadata(project),
    };
  }

  async getAllProjects(): Promise<ProjectWithMetadata[]> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(
      [PROJECTS_STORE, METADATA_STORE],
      'readonly'
    );

    const projectStore = transaction.objectStore(PROJECTS_STORE);
    const projects = await this.promisifyRequest<Project[]>(
      projectStore.getAll()
    );

    const metadataStore = transaction.objectStore(METADATA_STORE);
    const allMetadata = await this.promisifyRequest<StorageMetadata[]>(
      metadataStore.getAll()
    );

    const metadataMap = new Map(
      allMetadata.map((m) => [m.id.replace('meta-', ''), m])
    );

    return projects.map((project) => ({
      ...project,
      metadata:
        metadataMap.get(project.id) || this.createDefaultMetadata(project),
    }));
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(
      [PROJECTS_STORE, METADATA_STORE, AUTOSAVE_STORE],
      'readwrite'
    );

    // Delete project
    await this.promisifyRequest(
      transaction.objectStore(PROJECTS_STORE).delete(projectId)
    );

    // Delete metadata
    await this.promisifyRequest(
      transaction.objectStore(METADATA_STORE).delete(`meta-${projectId}`)
    );

    // Delete all autosaves for this project
    const autosaveStore = transaction.objectStore(AUTOSAVE_STORE);
    const autosaveIndex = autosaveStore.index('projectId');
    const autosaves = await this.promisifyRequest<any[]>(
      autosaveIndex.getAll(projectId)
    );

    for (const autosave of autosaves) {
      await this.promisifyRequest(autosaveStore.delete(autosave.id));
    }
  }

  async duplicateProject(projectId: string): Promise<Project | null> {
    const project = await this.loadProject(projectId);
    if (!project) return null;

    const newProject: Project = {
      ...project,
      id: `project-${Date.now()}`,
      name: `${project.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveProject(newProject);
    return newProject;
  }

  // Auto-save functionality
  async saveAutoSave(project: Project): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction([AUTOSAVE_STORE], 'readwrite');
    const store = transaction.objectStore(AUTOSAVE_STORE);

    const autoSave = {
      id: `autosave-${Date.now()}`,
      projectId: project.id,
      project,
      timestamp: new Date(),
    };

    await this.promisifyRequest(store.add(autoSave));

    // Keep only last 10 autosaves per project
    await this.cleanupAutoSaves(project.id);
  }

  async getLatestAutoSave(projectId: string): Promise<Project | null> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction([AUTOSAVE_STORE], 'readonly');
    const store = transaction.objectStore(AUTOSAVE_STORE);
    const index = store.index('projectId');

    const autosaves = await this.promisifyRequest<any[]>(
      index.getAll(projectId)
    );

    if (autosaves.length === 0) return null;

    // Sort by timestamp and get the latest
    autosaves.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return autosaves[0].project;
  }

  private async cleanupAutoSaves(projectId: string): Promise<void> {
    const transaction = this.db!.transaction([AUTOSAVE_STORE], 'readwrite');
    const store = transaction.objectStore(AUTOSAVE_STORE);
    const index = store.index('projectId');

    const autosaves = await this.promisifyRequest<any[]>(
      index.getAll(projectId)
    );

    if (autosaves.length <= 10) return;

    // Sort by timestamp and keep only the latest 10
    autosaves.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const toDelete = autosaves.slice(10);

    for (const autosave of toDelete) {
      await this.promisifyRequest(store.delete(autosave.id));
    }
  }

  // Settings management
  async saveSetting(key: string, value: any): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);

    await this.promisifyRequest(store.put({ key, value }));
  }

  async getSetting(key: string): Promise<any> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);

    const result = await this.promisifyRequest<{ key: string; value: any }>(
      store.get(key)
    );

    return result?.value;
  }

  // Storage info
  async getStorageInfo(): Promise<{
    usage: number;
    quota: number;
    projects: number;
  }> {
    await this.ensureInitialized();

    let usage = 0;
    let quota = 0;

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage || 0;
      quota = estimate.quota || 0;
    }

    const projects = await this.getAllProjects();

    return {
      usage,
      quota,
      projects: projects.length,
    };
  }

  // Export/Import
  async exportProject(projectId: string): Promise<Blob> {
    const project = await this.loadProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const json = JSON.stringify(project, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async importProject(file: File): Promise<Project> {
    const text = await file.text();
    const data = JSON.parse(text);

    // Generate new ID to avoid conflicts
    const project: Project = {
      ...data,
      id: `project-${Date.now()}`,
      createdAt: new Date(data.createdAt || Date.now()),
      updatedAt: new Date(),
    };

    await this.saveProject(project);
    return project;
  }

  // Utility methods
  private promisifyRequest<T = any>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private createDefaultMetadata(project: Project): StorageMetadata {
    return {
      id: `meta-${project.id}`,
      name: project.name,
      thumbnail: project.steps[0]?.thumbnail,
      size: new Blob([JSON.stringify(project)]).size,
      createdAt: project.createdAt || new Date(),
      updatedAt: project.updatedAt || new Date(),
      lastAccessedAt: new Date(),
      version: '1.0.0',
    };
  }

  // Cleanup
  async clear(): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(
      [PROJECTS_STORE, METADATA_STORE, AUTOSAVE_STORE, SETTINGS_STORE],
      'readwrite'
    );

    await Promise.all([
      this.promisifyRequest(transaction.objectStore(PROJECTS_STORE).clear()),
      this.promisifyRequest(transaction.objectStore(METADATA_STORE).clear()),
      this.promisifyRequest(transaction.objectStore(AUTOSAVE_STORE).clear()),
      this.promisifyRequest(transaction.objectStore(SETTINGS_STORE).clear()),
    ]);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const indexedDBStorage = new IndexedDBStorage();
