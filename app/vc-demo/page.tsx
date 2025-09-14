'use client';

import React, { useMemo, useRef, useState } from 'react';
import { VersionManager } from '@/lib/version-control/version-manager';
import type { ConflictResolution } from '@/lib/version-control/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const PROJECT_ID = 'vc-demo-project';

type ConflictUI = {
  path: string;
  choice: 'use_source' | 'use_target' | 'use_base' | 'manual';
  manualValue: string;
};

export default function VCDemoPage() {
  const vmRef = useRef<VersionManager | null>(null);
  const [mainBranchId, setMainBranchId] = useState<string>('');
  const [featureBranchId, setFeatureBranchId] = useState<string>('');
  const [log, setLog] = useState<string>('');
  const [compare, setCompare] = useState<{ ahead: number; behind: number; conflicts: string[] } | null>(null);
  const [conflicts, setConflicts] = useState<ConflictUI[]>([]);
  const [status, setStatus] = useState<string>('Idle');

  const appendLog = (msg: string) => setLog((prev) => `${prev}${prev ? '\n' : ''}${msg}`);

  const ensureVM = () => {
    if (!vmRef.current) vmRef.current = new VersionManager();
    return vmRef.current!;
  };

  const initProject = async () => {
    setStatus('Initializing project...');
    const vm = ensureVM();
    await vm.initProject(PROJECT_ID, {
      author: { name: 'Demo User' },
      defaultBranch: 'main',
    });
    const branches = await vm.getBranches(PROJECT_ID);
    const main = branches.find((b) => b.name === 'main');
    if (main) setMainBranchId(main.id);
    appendLog('Project initialized. Main branch ready.');
    setStatus('Ready');
  };

  const initialCommitOnMain = async () => {
    if (!mainBranchId) return appendLog('Main branch not set.');
    setStatus('Committing base data on main...');
    const vm = ensureVM();
    const data = {
      steps: [{ title: 'Step 1', description: 'Base', id: 's1' }],
      variables: { theme: 'light' },
      metadata: { name: 'VC Demo' },
    };
    await vm.commit(PROJECT_ID, mainBranchId, 'Initial commit on main', data);
    appendLog('Committed base data on main.');
    setStatus('Ready');
  };

  const createFeatureFromMain = async () => {
    if (!mainBranchId) return appendLog('Main branch not set.');
    setStatus('Creating feature branch...');
    const vm = ensureVM();
    const main = await vm.getBranch(PROJECT_ID, mainBranchId);
    const feature = await vm.createBranch(
      PROJECT_ID,
      'feature',
      'Feature work',
      main?.currentCommit || undefined
    );
    setFeatureBranchId(feature.id);
    appendLog(`Feature branch created (id=${feature.id}).`);
    setStatus('Ready');
  };

  const commitChangeMain = async () => {
    if (!mainBranchId) return appendLog('Main branch not set.');
    setStatus('Committing change on main...');
    const vm = ensureVM();
    // Read current snapshot of head and modify
    const branch = await vm.getBranch(PROJECT_ID, mainBranchId);
    if (!branch?.currentCommit) return appendLog('No commit on main.');
    const head = await vm.getCommit(branch.currentCommit);
    const snap = head ? await vm.getSnapshot(head.snapshotId) : null;
    if (!snap) return appendLog('Missing snapshot on main.');
    const data = structuredClone(snap.data);
    data.steps = data.steps || [];
    if (!data.steps[0]) data.steps[0] = { title: 'Step 1', description: 'Main' };
    data.steps[0].title = 'Title from MAIN';
    await vm.commit(PROJECT_ID, mainBranchId, 'Main changes title', data);
    appendLog('Committed change on main: steps.0.title = "Title from MAIN"');
    setStatus('Ready');
  };

  const commitChangeFeature = async () => {
    if (!featureBranchId) return appendLog('Feature branch not set.');
    setStatus('Committing change on feature...');
    const vm = ensureVM();
    const branch = await vm.getBranch(PROJECT_ID, featureBranchId);
    if (!branch?.currentCommit) return appendLog('No commit on feature (ensure branch was created from main after initial commit).');
    const head = await vm.getCommit(branch.currentCommit);
    const snap = head ? await vm.getSnapshot(head.snapshotId) : null;
    if (!snap) return appendLog('Missing snapshot on feature.');
    const data = structuredClone(snap.data);
    data.steps = data.steps || [];
    if (!data.steps[0]) data.steps[0] = { title: 'Step 1', description: 'Feature' };
    data.steps[0].title = 'Title from FEATURE';
    await vm.commit(PROJECT_ID, featureBranchId, 'Feature changes title', data);
    appendLog('Committed change on feature: steps.0.title = "Title from FEATURE"');
    setStatus('Ready');
  };

  const doCompare = async () => {
    if (!mainBranchId || !featureBranchId) return appendLog('Branches not set.');
    const vm = ensureVM();
    const res = await vm.compareBranches(PROJECT_ID, featureBranchId, mainBranchId);
    setCompare(res);
    appendLog(`Compare: ahead=${res.ahead}, behind=${res.behind}, conflicts=${res.conflicts.length}`);
  };

  const tryMerge = async () => {
    if (!mainBranchId || !featureBranchId) return appendLog('Branches not set.');
    setStatus('Merging feature into main...');
    const vm = ensureVM();
    try {
      const commit = await vm.mergeBranches(PROJECT_ID, featureBranchId, mainBranchId, 'Merge feature into main');
      appendLog(`Merge successful. New head commit on main: ${commit.id}`);
      setConflicts([]);
    } catch (e: any) {
      if (e?.code === 'MERGE_CONFLICT' && e?.details?.conflicts) {
        const cs: ConflictUI[] = (e.details.conflicts as any[]).map((c) => ({
          path: c.path,
          choice: 'use_source',
          manualValue: '',
        }));
        setConflicts(cs);
        appendLog(`Merge conflicts detected on ${cs.length} path(s).`);
      } else {
        appendLog(`Merge failed: ${e?.message || 'Unknown error'}`);
      }
    } finally {
      setStatus('Ready');
    }
  };

  const applyResolutions = async () => {
    if (!mainBranchId || !featureBranchId) return;
    const vm = ensureVM();
    const resolutions: ConflictResolution[] = conflicts.map((c) => {
      if (c.choice === 'manual') {
        let value: any = undefined;
        try {
          value = c.manualValue ? JSON.parse(c.manualValue) : undefined;
        } catch {
          // keep undefined to delete path
        }
        return { path: c.path, resolution: 'manual', value } as ConflictResolution;
      }
      return { path: c.path, resolution: c.choice } as ConflictResolution;
    });
    setStatus('Applying resolutions...');
    try {
      const commit = await vm.mergeWithResolutions(
        PROJECT_ID,
        featureBranchId,
        mainBranchId,
        resolutions,
        'Merge with resolutions'
      );
      appendLog(`Merge resolved. New head commit: ${commit.id}`);
      setConflicts([]);
    } catch (e: any) {
      appendLog(`Resolution failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setStatus('Ready');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Version Control Demo</h1>
          <p className="text-gray-600">Test commits, compare branches, and merge with conflict resolution (IndexedDB-backed).</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={initProject}>Init Project</Button>
            <Button variant="outline" onClick={initialCommitOnMain}>
              Commit initial on main
            </Button>
            <Button variant="outline" onClick={createFeatureFromMain}>
              Create feature branch
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Main:</span>
              <Badge variant="secondary">{mainBranchId ? mainBranchId.slice(0, 6) : '—'}</Badge>
              <span>Feature:</span>
              <Badge variant="secondary">{featureBranchId ? featureBranchId.slice(0, 6) : '—'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Make Changes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={commitChangeMain}>
              Commit change on main
            </Button>
            <Button variant="outline" onClick={commitChangeFeature}>
              Commit change on feature
            </Button>
            <Button variant="outline" onClick={doCompare}>
              Compare feature → main
            </Button>
            <Button onClick={tryMerge}>Merge feature into main</Button>
            {compare && (
              <div className="text-sm text-gray-700">
                ahead: {compare.ahead}, behind: {compare.behind}, conflicts predicted: {compare.conflicts.length}
              </div>
            )}
          </CardContent>
        </Card>

        {conflicts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resolve Conflicts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {conflicts.map((c, idx) => (
                <div key={c.path} className="space-y-2">
                  <div className="font-mono text-sm">{c.path}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={c.choice === 'use_source' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setConflicts((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, choice: 'use_source' } : x))
                        )
                      }
                    >
                      Use Source (feature)
                    </Button>
                    <Button
                      variant={c.choice === 'use_target' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setConflicts((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, choice: 'use_target' } : x))
                        )
                      }
                    >
                      Use Target (main)
                    </Button>
                    <Button
                      variant={c.choice === 'use_base' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setConflicts((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, choice: 'use_base' } : x))
                        )
                      }
                    >
                      Use Base
                    </Button>
                    <Button
                      variant={c.choice === 'manual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setConflicts((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, choice: 'manual' } : x))
                        )
                      }
                    >
                      Manual
                    </Button>
                  </div>
                  {c.choice === 'manual' && (
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600">Manual JSON value (leave empty to delete)</label>
                      <Textarea
                        value={c.manualValue}
                        onChange={(e) =>
                          setConflicts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, manualValue: e.target.value } : x))
                          )
                        }
                        placeholder='e.g. "Resolved Title" or {"key": "value"}'
                        className="min-h-20"
                      />
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={applyResolutions}>Apply Resolutions and Merge</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Status & Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-gray-700">Status: {status}</div>
            <Textarea readOnly value={log} className="min-h-40 font-mono text-sm" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

