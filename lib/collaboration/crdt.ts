import type { ContentChange } from './types';

/**
 * Very lightweight CRDT-like transformer for text ranges.
 * This is NOT a full CRDT, but provides:
 * - Commutative position adjustments for concurrent insert/delete
 * - Deterministic tie-breaking with actorId (userId)
 * - Idempotent application using change.id
 */

export interface CRDTOptions {
  readonly localActorId: string;
}

export function transformCRDT(
  local: ContentChange,
  remote: ContentChange,
  opts: CRDTOptions
): ContentChange {
  // If remote equals local id, return local unchanged
  if (remote.id === local.id) return local;

  const tieBreaker = (a: string, b: string) => (a === b ? 0 : a < b ? -1 : 1);

  // Adjust local position based on remote operation
  if (remote.type === 'insert') {
    if (remote.position < local.position) {
      return { ...local, position: local.position + remote.content.length };
    }
    if (remote.position === local.position) {
      // Concurrent insert at same spot: order by actorId and changeId
      const order =
        tieBreaker(remote.userId, local.userId) || tieBreaker(remote.id, local.id);
      return order < 0
        ? { ...local, position: local.position + remote.content.length }
        : local;
    }
  } else if (remote.type === 'delete') {
    const remoteEnd = remote.position + remote.content.length;
    // If remote deletion is entirely before local position, shift left
    if (remoteEnd <= local.position) {
      return { ...local, position: local.position - remote.content.length };
    }
    // If overlapping, clamp local position to start of remote deletion
    if (remote.position < local.position && local.position < remoteEnd) {
      return { ...local, position: remote.position };
    }
  } else if (remote.type === 'replace') {
    // Treat replace as delete + insert at same position
    const del = {
      ...remote,
      type: 'delete' as const,
      content: remote.content, // best-effort
    };
    const afterDelete = transformCRDT(local, del, opts);
    const ins = { ...remote, type: 'insert' as const };
    return transformCRDT(afterDelete, ins, opts);
  }

  return local;
}

/**
 * Check if two ranges overlap.
 */
export function overlaps(a: ContentChange, b: ContentChange): boolean {
  const aEnd = a.position + a.content.length;
  const bEnd = b.position + b.content.length;
  return !(aEnd <= b.position || bEnd <= a.position);
}

