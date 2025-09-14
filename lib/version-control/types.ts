/**
 * Version Control Types
 * Git-like version control system for PLAINER projects
 */

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  timestamp: number;
  message: string;
  author: {
    name: string;
    email?: string;
  };
  data: {
    steps: any[];
    variables: Record<string, any>;
    metadata: Record<string, any>;
    assets?: Record<string, any>;
  };
  parent?: string | null;
  tags?: string[];
}

export interface Branch {
  id: string;
  name: string;
  projectId: string;
  currentCommit: string;
  createdAt: number;
  description?: string;
  isActive?: boolean;
}

export interface Commit {
  id: string;
  projectId: string;
  branchId: string;
  message: string;
  author: {
    name: string;
    email?: string;
  };
  timestamp: number;
  snapshotId: string;
  parentId?: string | null;
  changes: Change[];
  stats: CommitStats;
}

export interface Change {
  type: 'add' | 'modify' | 'delete' | 'rename';
  path: string;
  oldPath?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: {
    stepIndex?: number;
    variableKey?: string;
    propertyPath?: string;
  };
}

export interface CommitStats {
  additions: number;
  deletions: number;
  modifications: number;
  filesChanged: number;
}

export interface Diff {
  path: string;
  type: 'add' | 'modify' | 'delete' | 'rename';
  oldValue?: any;
  newValue?: any;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface MergeRequest {
  id: string;
  projectId: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description?: string;
  author: {
    name: string;
    email?: string;
  };
  createdAt: number;
  status: 'pending' | 'merged' | 'closed' | 'conflicted';
  conflicts?: MergeConflict[];
}

export interface MergeConflict {
  path: string;
  type: 'content' | 'rename' | 'delete-modify';
  baseValue?: any;
  sourceValue?: any;
  targetValue?: any;
  resolved?: boolean;
  resolution?: any;
}

export interface Tag {
  id: string;
  name: string;
  projectId: string;
  commitId: string;
  message?: string;
  author: {
    name: string;
    email?: string;
  };
  createdAt: number;
  type: 'lightweight' | 'annotated';
}

export interface VersionControlConfig {
  projectId: string;
  defaultBranch: string;
  author: {
    name: string;
    email?: string;
  };
  autoCommit?: boolean;
  commitInterval?: number;
  maxHistory?: number;
  compressOldCommits?: boolean;
}

export interface VersionHistory {
  commits: Commit[];
  branches: Branch[];
  tags: Tag[];
  currentBranch: string;
}

export interface ConflictResolution {
  path: string;
  resolution: 'use_source' | 'use_target' | 'use_base' | 'manual';
  value?: any;
}

export interface BranchComparison {
  ahead: number;
  behind: number;
  commonAncestor?: string;
  conflicts: string[];
}

export interface StashEntry {
  id: string;
  projectId: string;
  branchId: string;
  message: string;
  timestamp: number;
  changes: Change[];
}

// Database schemas
export interface VersionControlDB {
  snapshots: ProjectSnapshot[];
  commits: Commit[];
  branches: Branch[];
  tags: Tag[];
  configs: VersionControlConfig[];
  stashes: StashEntry[];
}

// Event types for version control operations
export type VersionControlEvent =
  | { type: 'COMMIT_CREATED'; commit: Commit }
  | { type: 'BRANCH_CREATED'; branch: Branch }
  | { type: 'BRANCH_SWITCHED'; branchId: string }
  | { type: 'TAG_CREATED'; tag: Tag }
  | { type: 'MERGE_COMPLETED'; mergeRequest: MergeRequest }
  | { type: 'CONFLICT_DETECTED'; conflicts: MergeConflict[] }
  | { type: 'SNAPSHOT_CREATED'; snapshot: ProjectSnapshot };

// Error types
export class VersionControlError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VersionControlError';
  }
}

export class MergeConflictError extends VersionControlError {
  constructor(conflicts: MergeConflict[]) {
    super('Merge conflicts detected', 'MERGE_CONFLICT', { conflicts });
  }
}

export class BranchNotFoundError extends VersionControlError {
  constructor(branchName: string) {
    super(`Branch not found: ${branchName}`, 'BRANCH_NOT_FOUND', {
      branchName,
    });
  }
}

export class InvalidCommitError extends VersionControlError {
  constructor(commitId: string) {
    super(`Invalid commit: ${commitId}`, 'INVALID_COMMIT', { commitId });
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ProjectData = {
  steps: any[];
  variables: Record<string, any>;
  metadata: Record<string, any>;
  assets?: Record<string, any>;
};

export interface VersionControlEventListener {
  (event: VersionControlEvent): void | Promise<void>;
}
