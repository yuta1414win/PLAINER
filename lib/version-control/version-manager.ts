/**
 * Version Manager
 * Main version control engine with IndexedDB persistence
 */

import { nanoid } from 'nanoid';
import {
  ProjectSnapshot,
  Commit,
  Branch,
  Tag,
  VersionControlConfig,
  VersionHistory,
  ProjectData,
  Change,
  CommitStats,
  VersionControlEvent,
  VersionControlEventListener,
  VersionControlError,
  BranchNotFoundError,
  InvalidCommitError,
  StashEntry,
  VersionControlDB,
  MergeConflict,
  MergeConflictError,
  BranchComparison,
  ConflictResolution,
} from './types';

export class VersionManager {
  private dbName = 'plainer-version-control';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;
  private listeners: Set<VersionControlEventListener> = new Set();
  private config: VersionControlConfig | null = null;

  constructor() {
    this.initializeDB();
  }

  // Database initialization
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new VersionControlError('IndexedDB not available', 'DB_ERROR'));
      }
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () =>
        reject(new VersionControlError('Failed to open database', 'DB_ERROR'));

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', {
            keyPath: 'id',
          });
          snapshotStore.createIndex('projectId', 'projectId', {
            unique: false,
          });
          snapshotStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains('commits')) {
          const commitStore = db.createObjectStore('commits', {
            keyPath: 'id',
          });
          commitStore.createIndex('projectId', 'projectId', { unique: false });
          commitStore.createIndex('branchId', 'branchId', { unique: false });
          commitStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('branches')) {
          const branchStore = db.createObjectStore('branches', {
            keyPath: 'id',
          });
          branchStore.createIndex('projectId', 'projectId', { unique: false });
          branchStore.createIndex('name', ['projectId', 'name'], {
            unique: true,
          });
        }

        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
          tagStore.createIndex('projectId', 'projectId', { unique: false });
          tagStore.createIndex('name', ['projectId', 'name'], { unique: true });
        }

        if (!db.objectStoreNames.contains('configs')) {
          db.createObjectStore('configs', { keyPath: 'projectId' });
        }

        if (!db.objectStoreNames.contains('stashes')) {
          const stashStore = db.createObjectStore('stashes', { keyPath: 'id' });
          stashStore.createIndex('projectId', 'projectId', { unique: false });
          stashStore.createIndex('branchId', 'branchId', { unique: false });
        }

        // v2: merge requests store
        if (!db.objectStoreNames.contains('merge_requests')) {
          const mr = db.createObjectStore('merge_requests', { keyPath: 'id' });
          mr.createIndex('projectId', 'projectId', { unique: false });
          mr.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  // Event handling
  addEventListener(listener: VersionControlEventListener): void {
    this.listeners.add(listener);
  }

  // --- Merge Requests ---
  async createMergeRequest(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description?: string,
    author: { name: string; email?: string } = { name: 'Anonymous' }
  ): Promise<import('./types').MergeRequest> {
    await this.ensureDB();

    const mr: import('./types').MergeRequest = {
      id: nanoid(),
      projectId,
      sourceBranch,
      targetBranch,
      title,
      description,
      author,
      createdAt: Date.now(),
      status: 'pending',
    };

    const tx = this.db!.transaction(['merge_requests'], 'readwrite');
    await new Promise((resolve, reject) => {
      const req = tx.objectStore('merge_requests').add(mr);
      req.onsuccess = () => resolve(undefined);
      req.onerror = () => reject(req.error);
    });
    return mr;
  }

  async updateMergeRequestStatus(
    id: string,
    status: import('./types').MergeRequest['status'],
    conflicts?: import('./types').MergeConflict[]
  ): Promise<void> {
    await this.ensureDB();
    const tx = this.db!.transaction(['merge_requests'], 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const get = tx.objectStore('merge_requests').get(id);
      get.onsuccess = () => {
        const cur = get.result;
        if (!cur) return resolve();
        const next = { ...cur, status, conflicts };
        const put = tx.objectStore('merge_requests').put(next);
        put.onsuccess = () => resolve();
        put.onerror = () => reject(put.error);
      };
      get.onerror = () => reject(get.error);
    });
  }

  async listMergeRequests(
    projectId: string,
    opts?: { status?: import('./types').MergeRequest['status'] }
  ): Promise<import('./types').MergeRequest[]> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['merge_requests'], 'readonly');
      const store = tx.objectStore('merge_requests');
      const all = store.index('projectId').getAll(projectId);
      all.onsuccess = () => {
        const list = (all.result || []) as import('./types').MergeRequest[];
        const filtered = opts?.status ? list.filter((m) => m.status === opts.status) : list;
        resolve(filtered.sort((a, b) => b.createdAt - a.createdAt));
      };
      all.onerror = () => reject(all.error);
    });
  }

  // --- Partial restore & preview ---
  async previewRestoreFromCommit(
    projectId: string,
    targetBranchId: string,
    commitId: string,
    path: string
  ): Promise<{ currentValue: any; restoreValue: any } | null> {
    await this.ensureDB();
    const head = await this.getBranchHeadCommit(projectId, targetBranchId);
    const commit = await this.getCommit(commitId);
    if (!head || !commit) return null;
    const headSnap = await this.getSnapshot(head.snapshotId);
    const srcSnap = await this.getSnapshot(commit.snapshotId);
    if (!headSnap || !srcSnap) return null;
    return {
      currentValue: this.getByPath(headSnap.data, path),
      restoreValue: this.getByPath(srcSnap.data, path),
    };
  }

  async restorePathFromCommit(
    projectId: string,
    targetBranchId: string,
    commitId: string,
    path: string,
    message = ''
  ): Promise<Commit> {
    await this.ensureDB();
    const head = await this.getBranchHeadCommit(projectId, targetBranchId);
    const commit = await this.getCommit(commitId);
    if (!head || !commit) throw new InvalidCommitError(commitId);
    const headSnap = await this.getSnapshot(head.snapshotId);
    const srcSnap = await this.getSnapshot(commit.snapshotId);
    if (!headSnap || !srcSnap) throw new VersionControlError('Missing snapshot', 'MISSING_SNAPSHOT');

    const data = structuredClone(headSnap.data);
    const val = this.getByPath(srcSnap.data, path);
    if (val === undefined) {
      this.deleteByPath(data, path);
    } else {
      this.setByPath(data, path, val);
    }

    const msg = message || `Restore '${path}' from commit ${commitId}`;
    return await this.commit(projectId, targetBranchId, msg, data, this.config?.author);
  }

  removeEventListener(listener: VersionControlEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: VersionControlEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in version control listener:', error);
      }
    });
  }

  // Configuration management
  async initProject(
    projectId: string,
    config: Partial<VersionControlConfig>
  ): Promise<void> {
    await this.ensureDB();

    const fullConfig: VersionControlConfig = {
      projectId,
      defaultBranch: 'main',
      author: { name: 'Anonymous' },
      autoCommit: false,
      commitInterval: 300000, // 5 minutes
      maxHistory: 100,
      compressOldCommits: true,
      ...config,
    };

    this.config = fullConfig;

    // Create default branch if it doesn't exist
    const existingBranches = await this.getBranches(projectId);
    if (existingBranches.length === 0) {
      await this.createBranch(
        projectId,
        fullConfig.defaultBranch,
        'Initial branch'
      );
    }

    // Save configuration
    const transaction = this.db!.transaction(['configs'], 'readwrite');
    await new Promise((resolve, reject) => {
      const request = transaction.objectStore('configs').put(fullConfig);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getConfig(projectId: string): Promise<VersionControlConfig | null> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['configs'], 'readonly');
      const request = transaction.objectStore('configs').get(projectId);

      request.onsuccess = () => {
        this.config = request.result || null;
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Snapshot management
  async createSnapshot(
    projectId: string,
    data: ProjectData,
    message: string,
    author?: { name: string; email?: string }
  ): Promise<ProjectSnapshot> {
    await this.ensureDB();

    const config = await this.getConfig(projectId);
    const snapshotAuthor = author || config?.author || { name: 'Anonymous' };

    const snapshot: ProjectSnapshot = {
      id: nanoid(),
      projectId,
      timestamp: Date.now(),
      message,
      author: snapshotAuthor,
      data: structuredClone(data),
      parent: null,
    };

    const transaction = this.db!.transaction(['snapshots'], 'readwrite');
    await new Promise((resolve, reject) => {
      const request = transaction.objectStore('snapshots').add(snapshot);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });

    this.emit({ type: 'SNAPSHOT_CREATED', snapshot });
    return snapshot;
  }

  async getSnapshot(snapshotId: string): Promise<ProjectSnapshot | null> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['snapshots'], 'readonly');
      const request = transaction.objectStore('snapshots').get(snapshotId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Commit management
  async commit(
    projectId: string,
    branchId: string,
    message: string,
    data: ProjectData,
    author?: { name: string; email?: string }
  ): Promise<Commit> {
    await this.ensureDB();

    const config = await this.getConfig(projectId);
    const commitAuthor = author || config?.author || { name: 'Anonymous' };

    // Get current branch
    const branch = await this.getBranch(projectId, branchId);
    if (!branch) {
      throw new BranchNotFoundError(branchId);
    }

    // Create snapshot
    const snapshot = await this.createSnapshot(
      projectId,
      data,
      message,
      commitAuthor
    );

    // Calculate changes from parent commit
    let changes: Change[] = [];
    let parentId: string | null = null;

    if (branch.currentCommit) {
      const parentCommit = await this.getCommit(branch.currentCommit);
      if (parentCommit) {
        parentId = parentCommit.id;
        const parentSnapshot = await this.getSnapshot(parentCommit.snapshotId);
        if (parentSnapshot) {
          changes = this.calculateChanges(parentSnapshot.data, data);
        }
      }
    }

    // Calculate stats
    const stats: CommitStats = {
      additions: changes.filter((c) => c.type === 'add').length,
      deletions: changes.filter((c) => c.type === 'delete').length,
      modifications: changes.filter((c) => c.type === 'modify').length,
      filesChanged: new Set(changes.map((c) => c.path)).size,
    };

    const commit: Commit = {
      id: nanoid(),
      projectId,
      branchId,
      message,
      author: commitAuthor,
      timestamp: Date.now(),
      snapshotId: snapshot.id,
      parentId,
      changes,
      stats,
    };

    // Save commit
    const transaction = this.db!.transaction(
      ['commits', 'branches'],
      'readwrite'
    );

    await Promise.all([
      new Promise((resolve, reject) => {
        const request = transaction.objectStore('commits').add(commit);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const updatedBranch = { ...branch, currentCommit: commit.id };
        const request = transaction.objectStore('branches').put(updatedBranch);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      }),
    ]);

    this.emit({ type: 'COMMIT_CREATED', commit });
    return commit;
  }

  async getCommit(commitId: string): Promise<Commit | null> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['commits'], 'readonly');
      const request = transaction.objectStore('commits').get(commitId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getCommits(
    projectId: string,
    branchId?: string,
    limit?: number
  ): Promise<Commit[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['commits'], 'readonly');
      const store = transaction.objectStore('commits');
      const index = branchId
        ? store.index('branchId')
        : store.index('projectId');
      const key = branchId || projectId;

      const request = index.getAll(key);

      request.onsuccess = () => {
        let commits = request.result.sort((a, b) => b.timestamp - a.timestamp);
        if (limit) {
          commits = commits.slice(0, limit);
        }
        resolve(commits);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Branch management
  async createBranch(
    projectId: string,
    name: string,
    description?: string,
    sourceCommitId?: string
  ): Promise<Branch> {
    await this.ensureDB();

    const branch: Branch = {
      id: nanoid(),
      name,
      projectId,
      currentCommit: sourceCommitId || '',
      createdAt: Date.now(),
      description,
      isActive: false,
    };

    const transaction = this.db!.transaction(['branches'], 'readwrite');
    await new Promise((resolve, reject) => {
      const request = transaction.objectStore('branches').add(branch);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });

    this.emit({ type: 'BRANCH_CREATED', branch });
    return branch;
  }

  async getBranch(projectId: string, branchId: string): Promise<Branch | null> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['branches'], 'readonly');
      const request = transaction.objectStore('branches').get(branchId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getBranches(projectId: string): Promise<Branch[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['branches'], 'readonly');
      const index = transaction.objectStore('branches').index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async switchBranch(projectId: string, branchId: string): Promise<void> {
    await this.ensureDB();

    const branch = await this.getBranch(projectId, branchId);
    if (!branch) {
      throw new BranchNotFoundError(branchId);
    }

    // Update branch active status
    const branches = await this.getBranches(projectId);
    const transaction = this.db!.transaction(['branches'], 'readwrite');

    await Promise.all(
      branches.map((b) => {
        const updatedBranch = { ...b, isActive: b.id === branchId };
        return new Promise((resolve, reject) => {
          const request = transaction
            .objectStore('branches')
            .put(updatedBranch);
          request.onsuccess = () => resolve(undefined);
          request.onerror = () => reject(request.error);
        });
      })
    );

    this.emit({ type: 'BRANCH_SWITCHED', branchId });
  }

  // Tag management
  async createTag(
    projectId: string,
    name: string,
    commitId: string,
    message?: string,
    author?: { name: string; email?: string }
  ): Promise<Tag> {
    await this.ensureDB();

    const config = await this.getConfig(projectId);
    const tagAuthor = author || config?.author || { name: 'Anonymous' };

    const tag: Tag = {
      id: nanoid(),
      name,
      projectId,
      commitId,
      message,
      author: tagAuthor,
      createdAt: Date.now(),
      type: message ? 'annotated' : 'lightweight',
    };

    const transaction = this.db!.transaction(['tags'], 'readwrite');
    await new Promise((resolve, reject) => {
      const request = transaction.objectStore('tags').add(tag);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });

    this.emit({ type: 'TAG_CREATED', tag });
    return tag;
  }

  async getTags(projectId: string): Promise<Tag[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tags'], 'readonly');
      const index = transaction.objectStore('tags').index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // History and rollback
  async getHistory(projectId: string): Promise<VersionHistory> {
    const [commits, branches, tags] = await Promise.all([
      this.getCommits(projectId),
      this.getBranches(projectId),
      this.getTags(projectId),
    ]);

    const currentBranch = branches.find((b) => b.isActive)?.id || '';

    return {
      commits,
      branches,
      tags,
      currentBranch,
    };
  }

  async rollback(projectId: string, commitId: string): Promise<ProjectData> {
    const commit = await this.getCommit(commitId);
    if (!commit) {
      throw new InvalidCommitError(commitId);
    }

    const snapshot = await this.getSnapshot(commit.snapshotId);
    if (!snapshot) {
      throw new VersionControlError('Snapshot not found', 'SNAPSHOT_NOT_FOUND');
    }

    return structuredClone(snapshot.data);
  }

  // Utility methods
  private calculateChanges(
    oldData: ProjectData,
    newData: ProjectData
  ): Change[] {
    const changes: Change[] = [];

    // Compare steps
    this.compareArrays(oldData.steps, newData.steps, 'steps').forEach(
      (change) => {
        changes.push({
          ...change,
          metadata: { stepIndex: parseInt(change.path.split('.')[1]) },
        });
      }
    );

    // Compare variables
    this.compareObjects(
      oldData.variables,
      newData.variables,
      'variables'
    ).forEach((change) => {
      changes.push({
        ...change,
        metadata: { variableKey: change.path.split('.')[1] },
      });
    });

    // Compare metadata
    this.compareObjects(oldData.metadata, newData.metadata, 'metadata').forEach(
      (change) => {
        changes.push(change);
      }
    );

    // Compare assets
    if (oldData.assets || newData.assets) {
      this.compareObjects(
        oldData.assets || {},
        newData.assets || {},
        'assets'
      ).forEach((change) => {
        changes.push(change);
      });
    }

    return changes;
  }

  private compareArrays(
    oldArray: any[],
    newArray: any[],
    basePath: string
  ): Change[] {
    const changes: Change[] = [];
    const maxLength = Math.max(oldArray.length, newArray.length);

    for (let i = 0; i < maxLength; i++) {
      const path = `${basePath}.${i}`;
      const oldValue = oldArray[i];
      const newValue = newArray[i];

      if (i >= oldArray.length) {
        changes.push({ type: 'add', path, newValue });
      } else if (i >= newArray.length) {
        changes.push({ type: 'delete', path, oldValue });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ type: 'modify', path, oldValue, newValue });
      }
    }

    return changes;
  }

  private compareObjects(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    basePath: string
  ): Change[] {
    const changes: Change[] = [];
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const path = `${basePath}.${key}`;
      const oldValue = oldObj[key];
      const newValue = newObj[key];

      if (!(key in oldObj)) {
        changes.push({ type: 'add', path, newValue });
      } else if (!(key in newObj)) {
        changes.push({ type: 'delete', path, oldValue });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ type: 'modify', path, oldValue, newValue });
      }
    }

    return changes;
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }
  }

  // --- Branch utilities ---
  private async getBranchHeadCommit(
    projectId: string,
    branchId: string
  ): Promise<Commit | null> {
    const branch = await this.getBranch(projectId, branchId);
    if (!branch || !branch.currentCommit) return null;
    return await this.getCommit(branch.currentCommit);
  }

  private async getCommitChain(commitId: string): Promise<string[]> {
    const chain: string[] = [];
    let currentId: string | null = commitId;
    const seen = new Set<string>();
    while (currentId) {
      if (seen.has(currentId)) break; // safety loop guard
      seen.add(currentId);
      const commit = await this.getCommit(currentId);
      if (!commit) break;
      chain.push(commit.id);
      currentId = commit.parentId || null;
    }
    return chain;
  }

  private async findCommonAncestor(
    projectId: string,
    branchA: string,
    branchB: string
  ): Promise<string | null> {
    const headA = await this.getBranchHeadCommit(projectId, branchA);
    const headB = await this.getBranchHeadCommit(projectId, branchB);
    if (!headA || !headB) return null;

    const chainA = await this.getCommitChain(headA.id);
    const chainB = await this.getCommitChain(headB.id);
    const setB = new Set(chainB);
    for (const id of chainA) {
      if (setB.has(id)) return id;
    }
    return null;
  }

  /**
   * Compare two branches and return ahead/behind counts and rough conflict paths.
   */
  async compareBranches(
    projectId: string,
    sourceBranchId: string,
    targetBranchId: string
  ): Promise<BranchComparison> {
    await this.ensureDB();

    const headSrc = await this.getBranchHeadCommit(projectId, sourceBranchId);
    const headTgt = await this.getBranchHeadCommit(projectId, targetBranchId);
    if (!headSrc || !headTgt) {
      return { ahead: 0, behind: 0, conflicts: [] };
    }

    const common = await this.findCommonAncestor(
      projectId,
      sourceBranchId,
      targetBranchId
    );

    // ahead/behind = distance from heads to common ancestor
    const chainSrc = await this.getCommitChain(headSrc.id);
    const chainTgt = await this.getCommitChain(headTgt.id);
    const idxSrc = common ? chainSrc.indexOf(common) : -1;
    const idxTgt = common ? chainTgt.indexOf(common) : -1;
    const ahead = idxSrc >= 0 ? idxSrc : chainSrc.length;
    const behind = idxTgt >= 0 ? idxTgt : chainTgt.length;

    // Rough conflict prediction via latest snapshots three-way check
    const conflicts: string[] = [];
    const baseCommit = common ? await this.getCommit(common) : null;
    if (baseCommit) {
      const baseSnap = await this.getSnapshot(baseCommit.snapshotId);
      const srcSnap = await this.getSnapshot(headSrc.snapshotId);
      const tgtSnap = await this.getSnapshot(headTgt.snapshotId);
      if (baseSnap && srcSnap && tgtSnap) {
        const base = baseSnap.data;
        const src = srcSnap.data;
        const tgt = tgtSnap.data;
        const srcChanges = this.calculateChanges(base, src).map((c) => c.path);
        const tgtChanges = this.calculateChanges(base, tgt).map((c) => c.path);
        const setT = new Set(tgtChanges);
        for (const p of srcChanges) {
          if (setT.has(p)) conflicts.push(p);
        }
      }
    }

    return { ahead, behind, conflicts };
  }

  /**
   * Attempt a three-way auto-merge from source branch into target branch.
   * - Fast-forward if possible.
   * - Three-way merge for non-conflicting paths.
   * - If conflicts remain, throws MergeConflictError with details.
   * On success, creates a merge commit on target branch and returns it.
   */
  async mergeBranches(
    projectId: string,
    sourceBranchId: string,
    targetBranchId: string,
    message = ''
  ): Promise<Commit> {
    await this.ensureDB();

    if (sourceBranchId === targetBranchId) {
      throw new VersionControlError(
        'Cannot merge a branch into itself',
        'INVALID_MERGE'
      );
    }

    const srcHead = await this.getBranchHeadCommit(projectId, sourceBranchId);
    const tgtHead = await this.getBranchHeadCommit(projectId, targetBranchId);
    if (!srcHead || !tgtHead) {
      throw new VersionControlError('Missing branch head', 'MISSING_HEAD');
    }

    // Fast-forward if target is behind source and target's head is ancestor of source
    const tgtChain = await this.getCommitChain(tgtHead.id);
    if (tgtChain.includes(srcHead.id)) {
      // source is ancestor of target (no-op merge)
      return tgtHead;
    }
    const srcChain = await this.getCommitChain(srcHead.id);
    if (srcChain.includes(tgtHead.id)) {
      // Fast-forward target to source
      const tgtBranch = await this.getBranch(projectId, targetBranchId);
      if (!tgtBranch) throw new BranchNotFoundError(targetBranchId);
      const transaction = this.db!.transaction(['branches'], 'readwrite');
      await new Promise((resolve, reject) => {
        const request = transaction
          .objectStore('branches')
          .put({ ...tgtBranch, currentCommit: srcHead.id });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      // Emit event via a synthetic commit-created-like event is not necessary; return srcHead
      return srcHead;
    }

    // Three-way merge
    const commonId = await this.findCommonAncestor(
      projectId,
      sourceBranchId,
      targetBranchId
    );
    if (!commonId) {
      throw new VersionControlError(
        'No common ancestor found for merge',
        'NO_COMMON_ANCESTOR'
      );
    }

    const baseCommit = await this.getCommit(commonId);
    const baseSnap = baseCommit
      ? await this.getSnapshot(baseCommit.snapshotId)
      : null;
    const srcSnap = await this.getSnapshot(srcHead.snapshotId);
    const tgtSnap = await this.getSnapshot(tgtHead.snapshotId);
    if (!baseSnap || !srcSnap || !tgtSnap) {
      throw new VersionControlError('Missing snapshots', 'MISSING_SNAPSHOT');
    }

    const base = structuredClone(baseSnap.data);
    const src = structuredClone(srcSnap.data);
    const tgt = structuredClone(tgtSnap.data);

    const result = structuredClone(tgt); // start from target

    const conflicts: MergeConflict[] = [];

    // Build change maps by path
    const srcChanges = this.calculateChanges(base, src);
    const tgtChanges = this.calculateChanges(base, tgt);
    const tgtPaths = new Set(tgtChanges.map((c) => c.path));

    // For each source change, apply if target didn't change same path; else check equality; else conflict
    for (const change of srcChanges) {
      const path = change.path;
      const baseVal = this.getByPath(base, path);
      const srcVal = this.getByPath(src, path);
      const tgtVal = this.getByPath(tgt, path);

      if (!tgtPaths.has(path)) {
        // Target unchanged at this path relative to base -> adopt source
        if (change.type === 'delete') {
          this.deleteByPath(result, path);
        } else {
          this.setByPath(result, path, srcVal);
        }
        continue;
      }

      // Both changed this path
      if (this.deepEqual(srcVal, tgtVal)) {
        // Same resolution on both sides -> keep (already in result)
        continue;
      }

      // If one side equals base and the other differs, prefer the differing side
      const srcEqualsBase = this.deepEqual(srcVal, baseVal);
      const tgtEqualsBase = this.deepEqual(tgtVal, baseVal);
      if (srcEqualsBase && !tgtEqualsBase) {
        // keep target change (already present)
        continue;
      }
      if (!srcEqualsBase && tgtEqualsBase) {
        // adopt source
        if (change.type === 'delete') this.deleteByPath(result, path);
        else this.setByPath(result, path, srcVal);
        continue;
      }

      // True conflict
      conflicts.push({
        path,
        type: 'content',
        baseValue: baseVal,
        sourceValue: srcVal,
        targetValue: tgtVal,
        resolved: false,
      });
    }

    if (conflicts.length > 0) {
      throw new MergeConflictError(conflicts);
    }

    // Create merge commit on target branch using merged result
    const mergeMessage =
      message || `Merge branch '${sourceBranchId}' into '${targetBranchId}'`;
    const commit = await this.commit(
      projectId,
      targetBranchId,
      mergeMessage,
      result,
      this.config?.author
    );
    return commit;
  }

  /**
   * Merge with explicit resolutions for conflicting paths.
   * Applies a three-way merge, auto-applies non-conflicting changes,
   * and uses provided resolutions to finalize conflicts.
   * Throws MergeConflictError if some conflicts remain unresolved.
   */
  async mergeWithResolutions(
    projectId: string,
    sourceBranchId: string,
    targetBranchId: string,
    resolutions: ConflictResolution[],
    message = ''
  ): Promise<Commit> {
    await this.ensureDB();

    if (sourceBranchId === targetBranchId) {
      throw new VersionControlError(
        'Cannot merge a branch into itself',
        'INVALID_MERGE'
      );
    }

    const srcHead = await this.getBranchHeadCommit(projectId, sourceBranchId);
    const tgtHead = await this.getBranchHeadCommit(projectId, targetBranchId);
    if (!srcHead || !tgtHead) {
      throw new VersionControlError('Missing branch head', 'MISSING_HEAD');
    }

    // Fast-forward checks
    const tgtChain = await this.getCommitChain(tgtHead.id);
    if (tgtChain.includes(srcHead.id)) {
      return tgtHead; // no-op
    }
    const srcChain = await this.getCommitChain(srcHead.id);
    if (srcChain.includes(tgtHead.id)) {
      // Fast-forward target to source
      const tgtBranch = await this.getBranch(projectId, targetBranchId);
      if (!tgtBranch) throw new BranchNotFoundError(targetBranchId);
      const transaction = this.db!.transaction(['branches'], 'readwrite');
      await new Promise((resolve, reject) => {
        const request = transaction
          .objectStore('branches')
          .put({ ...tgtBranch, currentCommit: srcHead.id });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      return srcHead;
    }

    const commonId = await this.findCommonAncestor(
      projectId,
      sourceBranchId,
      targetBranchId
    );
    if (!commonId) {
      throw new VersionControlError(
        'No common ancestor found for merge',
        'NO_COMMON_ANCESTOR'
      );
    }

    const baseCommit = await this.getCommit(commonId);
    const baseSnap = baseCommit
      ? await this.getSnapshot(baseCommit.snapshotId)
      : null;
    const srcSnap = await this.getSnapshot(srcHead.snapshotId);
    const tgtSnap = await this.getSnapshot(tgtHead.snapshotId);
    if (!baseSnap || !srcSnap || !tgtSnap) {
      throw new VersionControlError('Missing snapshots', 'MISSING_SNAPSHOT');
    }

    const base = structuredClone(baseSnap.data);
    const src = structuredClone(srcSnap.data);
    const tgt = structuredClone(tgtSnap.data);
    const result = structuredClone(tgt);

    const conflicts: MergeConflict[] = [];
    const srcChanges = this.calculateChanges(base, src);
    const tgtChanges = this.calculateChanges(base, tgt);
    const tgtPaths = new Set(tgtChanges.map((c) => c.path));

    for (const change of srcChanges) {
      const path = change.path;
      const srcVal = this.getByPath(src, path);
      const tgtVal = this.getByPath(tgt, path);
      const baseVal = this.getByPath(base, path);

      if (!tgtPaths.has(path)) {
        // Only source changed => apply
        if (change.type === 'delete') this.deleteByPath(result, path);
        else this.setByPath(result, path, srcVal);
        continue;
      }

      // Both changed; if equal, adopt value
      if (this.deepEqual(srcVal, tgtVal)) {
        if (change.type === 'delete') this.deleteByPath(result, path);
        else this.setByPath(result, path, srcVal);
        continue;
      }

      // Conflict
      conflicts.push({
        path,
        type: 'content',
        baseValue: baseVal,
        sourceValue: srcVal,
        targetValue: tgtVal,
        resolved: false,
      });
    }

    // Apply provided resolutions
    const resolved = new Set<string>();
    for (const r of resolutions) {
      const path = r.path;
      const baseVal = this.getByPath(base, path);
      const srcVal = this.getByPath(src, path);
      const tgtVal = this.getByPath(tgt, path);
      switch (r.resolution) {
        case 'use_source':
          if (srcVal === undefined) this.deleteByPath(result, path);
          else this.setByPath(result, path, srcVal);
          resolved.add(path);
          break;
        case 'use_target':
          if (tgtVal === undefined) this.deleteByPath(result, path);
          else this.setByPath(result, path, tgtVal);
          resolved.add(path);
          break;
        case 'use_base':
          if (baseVal === undefined) this.deleteByPath(result, path);
          else this.setByPath(result, path, baseVal);
          resolved.add(path);
          break;
        case 'manual':
          if (r.value === undefined) this.deleteByPath(result, path);
          else this.setByPath(result, path, r.value);
          resolved.add(path);
          break;
        default:
          // ignore invalid
          break;
      }
    }

    const unresolved = conflicts.filter((c) => !resolved.has(c.path));
    if (unresolved.length > 0) {
      throw new MergeConflictError(unresolved);
    }

    // Create merge commit
    const mergeMessage =
      message || `Merge branch '${sourceBranchId}' into '${targetBranchId}' (resolved)`;
    const commit = await this.commit(
      projectId,
      targetBranchId,
      mergeMessage,
      result,
      this.config?.author
    );
    return commit;
  }

  // --- Path utilities for nested data ---
  private pathToKeys(path: string): (string | number)[] {
    // supports simple dot paths like 'steps.3.title' or 'variables.foo'
    return path.split('.').map((p) => (p.match(/^\d+$/) ? Number(p) : p));
  }

  private getByPath(obj: any, path: string): any {
    const keys = this.pathToKeys(path);
    let cur = obj;
    for (const k of keys) {
      if (cur == null) return undefined;
      cur = cur[k as any];
    }
    return cur;
  }

  private setByPath(obj: any, path: string, value: any): void {
    const keys = this.pathToKeys(path);
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (cur[k as any] == null) {
        // create container (array vs object) based on next key
        const next = keys[i + 1];
        cur[k as any] = typeof next === 'number' ? [] : {};
      }
      cur = cur[k as any];
    }
    const last = keys[keys.length - 1];
    cur[last as any] = value;
  }

  private deleteByPath(obj: any, path: string): void {
    const keys = this.pathToKeys(path);
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (cur == null) return;
      cur = cur[k as any];
    }
    const last = keys[keys.length - 1];
    if (Array.isArray(cur) && typeof last === 'number') {
      if (last >= 0 && last < cur.length) cur.splice(last, 1);
    } else if (cur && typeof cur === 'object') {
      delete cur[last as any];
    }
  }

  private deepEqual(a: any, b: any): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return a === b;
    }
  }

  // Cleanup and maintenance
  async cleanup(projectId: string): Promise<void> {
    const config = await this.getConfig(projectId);
    if (!config?.compressOldCommits) return;

    const commits = await this.getCommits(projectId);
    const maxHistory = config.maxHistory || 100;

    if (commits.length > maxHistory) {
      const oldCommits = commits.slice(maxHistory);
      const transaction = this.db!.transaction(
        ['commits', 'snapshots'],
        'readwrite'
      );

      await Promise.all(
        oldCommits.map((commit) =>
          Promise.all([
            new Promise((resolve, reject) => {
              const request = transaction
                .objectStore('commits')
                .delete(commit.id);
              request.onsuccess = () => resolve(undefined);
              request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
              const request = transaction
                .objectStore('snapshots')
                .delete(commit.snapshotId);
              request.onsuccess = () => resolve(undefined);
              request.onerror = () => reject(request.error);
            }),
          ])
        )
      );
    }
  }
}
