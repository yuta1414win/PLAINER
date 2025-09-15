'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FolderOpen,
  Grid3x3,
  List,
  Search,
  Plus,
  MoreVertical,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit,
  Calendar,
  Clock,
  HardDrive,
  SortAsc,
  SortDesc,
  Filter,
} from 'lucide-react';
import { formatDistanceToNowJa } from '@/lib/date';
import { getIndexedDBStorage, type ProjectWithMetadata } from '@/lib/storage/indexed-db';
import { useEditorStore } from '@/lib/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectSelect?: (project: ProjectWithMetadata) => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'updatedAt' | 'createdAt' | 'size';
type SortOrder = 'asc' | 'desc';

export function ProjectManager({
  open,
  onOpenChange,
  onProjectSelect,
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<ProjectWithMetadata[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<
    ProjectWithMetadata[]
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedProject, setSelectedProject] =
    useState<ProjectWithMetadata | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    projects: number;
  } | null>(null);

  const { setProject, createProject } = useEditorStore();

  // Load projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const allProjects = await getIndexedDBStorage().getAllProjects();
      setProjects(allProjects);
      setFilteredProjects(allProjects);

      // Get storage info
      const info = await getIndexedDBStorage().getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('プロジェクトの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, loadProjects]);

  // Filter and sort projects
  useEffect(() => {
    let filtered = projects;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updatedAt':
          comparison =
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'createdAt':
          comparison =
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'size':
          comparison = (b.metadata?.size || 0) - (a.metadata?.size || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredProjects(filtered);
  }, [projects, searchQuery, sortBy, sortOrder]);

  // Handle project actions
  const handleOpenProject = async (project: ProjectWithMetadata) => {
    try {
      setProject(project);
      onProjectSelect?.(project);
      onOpenChange(false);
      toast.success(`プロジェクト「${project.name}」を開きました`);
    } catch (error) {
      console.error('Failed to open project:', error);
      toast.error('プロジェクトを開けませんでした');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      await getIndexedDBStorage().deleteProject(selectedProject.id);
      toast.success(`プロジェクト「${selectedProject.name}」を削除しました`);
      await loadProjects();
      setShowDeleteDialog(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('プロジェクトの削除に失敗しました');
    }
  };

  const handleDuplicateProject = async (project: ProjectWithMetadata) => {
    try {
      const duplicated = await getIndexedDBStorage().duplicateProject(project.id);
      if (duplicated) {
        toast.success(`プロジェクト「${project.name}」を複製しました`);
        await loadProjects();
      }
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      toast.error('プロジェクトの複製に失敗しました');
    }
  };

  const handleExportProject = async (project: ProjectWithMetadata) => {
    try {
      const blob = await getIndexedDBStorage().exportProject(project.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('プロジェクトをエクスポートしました');
    } catch (error) {
      console.error('Failed to export project:', error);
      toast.error('エクスポートに失敗しました');
    }
  };

  const handleImportProject = async (file: File) => {
    try {
      const imported = await getIndexedDBStorage().importProject(file);
      toast.success(`プロジェクト「${imported.name}」をインポートしました`);
      await loadProjects();
    } catch (error) {
      console.error('Failed to import project:', error);
      toast.error('インポートに失敗しました');
    }
  };

  const handleRenameProject = async () => {
    if (!selectedProject || !newProjectName.trim()) return;

    try {
      const updatedProject = {
        ...selectedProject,
        name: newProjectName.trim(),
        updatedAt: new Date(),
      };
      await getIndexedDBStorage().saveProject(updatedProject);
      toast.success('プロジェクト名を変更しました');
      await loadProjects();
      setShowRenameDialog(false);
      setSelectedProject(null);
      setNewProjectName('');
    } catch (error) {
      console.error('Failed to rename project:', error);
      toast.error('名前の変更に失敗しました');
    }
  };

  const handleCreateNewProject = () => {
    createProject('新しいプロジェクト');
    onOpenChange(false);
    toast.success('新しいプロジェクトを作成しました');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatStoragePercentage = () => {
    if (!storageInfo || storageInfo.quota === 0) return '0';
    return ((storageInfo.usage / storageInfo.quota) * 100).toFixed(1);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              プロジェクト管理
            </DialogTitle>
            <DialogDescription>
              プロジェクトを開く、作成、または管理します
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="projects" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects">プロジェクト</TabsTrigger>
              <TabsTrigger value="storage">ストレージ</TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="プロジェクトを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <SortAsc className="w-4 h-4 mr-2" />
                        並べ替え
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSortBy('name')}>
                        名前
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('updatedAt')}>
                        更新日時
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('createdAt')}>
                        作成日時
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('size')}>
                        サイズ
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        }
                      >
                        {sortOrder === 'asc' ? '降順' : '昇順'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                    }
                  >
                    {viewMode === 'grid' ? (
                      <List className="w-4 h-4" />
                    ) : (
                      <Grid3x3 className="w-4 h-4" />
                    )}
                  </Button>

                  <Button onClick={handleCreateNewProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    新規作成
                  </Button>

                  <label htmlFor="import-file">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        インポート
                      </span>
                    </Button>
                  </label>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportProject(file);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Projects Grid/List */}
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-muted-foreground">読み込み中...</div>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <div className="text-muted-foreground">
                      {searchQuery
                        ? '該当するプロジェクトが見つかりません'
                        : 'プロジェクトがありません'}
                    </div>
                    {!searchQuery && (
                      <Button
                        onClick={handleCreateNewProject}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        新規作成
                      </Button>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                    {filteredProjects.map((project) => (
                      <Card
                        key={project.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleOpenProject(project)}
                      >
                        <CardHeader className="p-4">
                          {project.metadata?.thumbnail ? (
                            <img
                              src={project.metadata.thumbnail}
                              alt={project.name}
                              className="w-full h-32 object-cover rounded-md mb-2"
                            />
                          ) : (
                            <div className="w-full h-32 bg-muted rounded-md mb-2 flex items-center justify-center">
                              <FolderOpen className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <CardTitle className="text-sm truncate">
                            {project.name}
                          </CardTitle>
                        </CardHeader>
                        <CardFooter className="p-4 pt-0 flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNowJa(new Date(project.updatedAt))}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProject(project);
                                }}
                              >
                                <FolderOpen className="w-4 h-4 mr-2" />
                                開く
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setNewProjectName(project.name);
                                  setShowRenameDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                名前を変更
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateProject(project);
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                複製
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportProject(project);
                                }}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                エクスポート
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 p-1">
                    {filteredProjects.map((project) => (
                      <Card
                        key={project.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleOpenProject(project)}
                      >
                        <CardHeader className="p-4 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            {project.metadata?.thumbnail ? (
                              <img
                                src={project.metadata.thumbnail}
                                alt={project.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <FolderOpen className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-base">
                                {project.name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDistanceToNowJa(new Date(project.createdAt))}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNowJa(new Date(project.updatedAt))}
                                </span>
                                <span className="flex items-center gap-1">
                                  <HardDrive className="w-3 h-3" />
                                  {formatFileSize(project.metadata?.size || 0)}
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProject(project);
                                }}
                              >
                                <FolderOpen className="w-4 h-4 mr-2" />
                                開く
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setNewProjectName(project.name);
                                  setShowRenameDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                名前を変更
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateProject(project);
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                複製
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportProject(project);
                                }}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                エクスポート
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="storage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>ストレージ使用状況</CardTitle>
                  <CardDescription>
                    ブラウザのストレージ使用状況を確認します
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {storageInfo && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>使用済み</span>
                          <span className="font-medium">
                            {formatFileSize(storageInfo.usage)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>利用可能</span>
                          <span className="font-medium">
                            {formatFileSize(storageInfo.quota)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>プロジェクト数</span>
                          <span className="font-medium">
                            {storageInfo.projects}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>使用率</span>
                          <span className="font-medium">
                            {formatStoragePercentage()}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              parseFloat(formatStoragePercentage()) > 90
                                ? 'bg-destructive'
                                : parseFloat(formatStoragePercentage()) > 70
                                  ? 'bg-yellow-500'
                                  : 'bg-primary'
                            )}
                            style={{
                              width: `${formatStoragePercentage()}%`,
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (
                        confirm('すべてのプロジェクトデータを削除しますか？')
                      ) {
                        await getIndexedDBStorage().clear();
                        await loadProjects();
                        toast.success('すべてのデータを削除しました');
                      }
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    すべてクリア
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プロジェクトを削除</AlertDialogTitle>
            <AlertDialogDescription>
              プロジェクト「{selectedProject?.name}
              」を削除してもよろしいですか？
              この操作は取り消すことができません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プロジェクト名を変更</DialogTitle>
            <DialogDescription>
              新しいプロジェクト名を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">プロジェクト名</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="プロジェクト名を入力"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
            >
              キャンセル
            </Button>
            <Button onClick={handleRenameProject}>変更</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
