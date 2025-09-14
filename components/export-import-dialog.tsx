'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/lib/types';
import { toast } from 'sonner';

interface ExportImportDialogProps {
  project: Project;
  onImport?: (project: Partial<Project>) => void;
  children: React.ReactNode;
}

interface ExportOptions {
  includeImages: boolean;
  includeTheme: boolean;
  includeMetadata: boolean;
  format: 'full' | 'minimal';
}

export function ExportImportDialog({
  project,
  onImport,
  children,
}: ExportImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeImages: true,
    includeTheme: true,
    includeMetadata: true,
    format: 'full',
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importValidation, setImportValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    projectPreview?: Partial<Project>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // エクスポート機能
  const handleExport = useCallback(() => {
    try {
      let exportData: any = { ...project };

      // オプションに基づいてデータを調整
      if (exportOptions.format === 'minimal') {
        exportData = {
          id: project.id,
          name: project.name,
          description: project.description,
          steps: project.steps.map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            image: exportOptions.includeImages ? step.image : '',
            thumbnail: exportOptions.includeImages ? step.thumbnail : '',
            hotspots: step.hotspots,
            annotations: step.annotations,
            cta: step.cta,
            masks: step.masks,
            order: step.order,
          })),
          chapters: project.chapters,
          theme: exportOptions.includeTheme
            ? project.theme
            : {
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                accentColor: '#28a745',
                backgroundColor: '#ffffff',
                textColor: '#000000',
                borderColor: '#dee2e6',
                fontFamily: 'system-ui',
                fontSize: 14,
                borderRadius: 4,
                spacing: 16,
              },
          language: project.language,
          isPublic: project.isPublic,
        };
      }

      if (!exportOptions.includeMetadata) {
        delete exportData.createdAt;
        delete exportData.updatedAt;
        delete exportData.shareUrl;
      }

      // メタデータを追加
      const exportWithMeta = {
        meta: {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'PLAINER',
          format: exportOptions.format,
          options: exportOptions,
        },
        project: exportData,
      };

      const jsonString = JSON.stringify(exportWithMeta, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      toast.success('プロジェクトをエクスポートしました');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('エクスポートに失敗しました');
    }
  }, [project, exportOptions]);

  // ファイル選択処理
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast.error('JSONファイルを選択してください');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        // 50MB制限
        toast.error('ファイルサイズが大きすぎます（50MB以下にしてください）');
        return;
      }

      setImportFile(file);
      validateImportFile(file);
    },
    []
  );

  // インポートファイルの検証
  const validateImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const errors: string[] = [];
      const warnings: string[] = [];
      let projectData: Partial<Project>;

      // ファイル形式の判定
      if (data.meta && data.project) {
        // PLAINER形式
        projectData = data.project;

        if (data.meta.version !== '1.0') {
          warnings.push(`バージョンが異なります (${data.meta.version})`);
        }
      } else if (data.id && data.name && data.steps) {
        // 直接プロジェクト形式
        projectData = data;
      } else {
        errors.push('無効なファイル形式です');
        setImportValidation({ isValid: false, errors, warnings });
        return;
      }

      // 必須フィールドの検証
      if (!projectData.name) {
        errors.push('プロジェクト名が不足しています');
      }

      if (!projectData.steps || !Array.isArray(projectData.steps)) {
        errors.push('ステップデータが不足しています');
      } else {
        // ステップの検証
        projectData.steps.forEach((step, index) => {
          if (!step.id) {
            errors.push(`ステップ ${index + 1}: IDが不足しています`);
          }
          if (!step.title) {
            errors.push(`ステップ ${index + 1}: タイトルが不足しています`);
          }
          if (!step.image) {
            warnings.push(`ステップ ${index + 1}: 画像が不足しています`);
          }
        });
      }

      // テーマの検証
      if (projectData.theme) {
        const requiredThemeFields = [
          'primaryColor',
          'backgroundColor',
          'textColor',
        ];
        requiredThemeFields.forEach((field) => {
          if (!projectData.theme![field as keyof typeof projectData.theme]) {
            warnings.push(`テーマ設定: ${field}が不足しています`);
          }
        });
      } else {
        warnings.push('テーマ設定が不足しています（デフォルトが適用されます）');
      }

      const isValid = errors.length === 0;

      setImportValidation({
        isValid,
        errors,
        warnings,
        projectPreview: isValid ? projectData : undefined,
      });
    } catch (error) {
      setImportValidation({
        isValid: false,
        errors: ['ファイルの解析に失敗しました'],
        warnings: [],
      });
    }
  }, []);

  // インポート実行
  const handleImport = useCallback(() => {
    if (!importValidation?.isValid || !importValidation.projectPreview) {
      toast.error('有効なファイルを選択してください');
      return;
    }

    try {
      // 必要なフィールドを補完
      const importedProject: Partial<Project> = {
        ...importValidation.projectPreview,
        id: importValidation.projectPreview.id || `imported-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        variables: importValidation.projectPreview.variables || [],
        variableInstances:
          importValidation.projectPreview.variableInstances || {},
        conditionalSteps:
          importValidation.projectPreview.conditionalSteps || [],
        shareUrl: undefined, // 新しいプロジェクトとして扱う
      };

      onImport?.(importedProject);
      setIsOpen(false);
      setImportFile(null);
      setImportValidation(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('プロジェクトをインポートしました');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('インポートに失敗しました');
    }
  }, [importValidation, onImport]);

  // ドラッグ&ドロップ処理
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      const jsonFile = files.find(
        (file) =>
          file.type === 'application/json' || file.name.endsWith('.json')
      );

      if (jsonFile) {
        setImportFile(jsonFile);
        validateImportFile(jsonFile);
      } else {
        toast.error('JSONファイルをドロップしてください');
      }
    },
    [validateImportFile]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            エクスポート / インポート
          </DialogTitle>
          <DialogDescription>
            プロジェクトをJSONファイルでエクスポート・インポートできます
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              エクスポート
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              インポート
            </TabsTrigger>
          </TabsList>

          {/* エクスポートタブ */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">エクスポート設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">出力形式</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="full"
                        checked={exportOptions.format === 'full'}
                        onChange={(e) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            format: e.target.value as 'full' | 'minimal',
                          }))
                        }
                      />
                      <span className="text-sm">完全版（全データ）</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="minimal"
                        checked={exportOptions.format === 'minimal'}
                        onChange={(e) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            format: e.target.value as 'full' | 'minimal',
                          }))
                        }
                      />
                      <span className="text-sm">
                        最小版（必要なデータのみ）
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">含めるデータ</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeImages}
                        onChange={(e) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includeImages: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">画像データ</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeTheme}
                        onChange={(e) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includeTheme: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">テーマ設定</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeMetadata}
                        onChange={(e) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includeMetadata: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">
                        メタデータ（作成日時など）
                      </span>
                    </label>
                  </div>
                </div>

                <Button onClick={handleExport} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  エクスポート
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* インポートタブ */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ファイル選択</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4 hover:border-muted-foreground/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      JSONファイルをドロップまたは選択
                    </p>
                    <p className="text-xs text-muted-foreground">
                      最大50MB、PLAINER形式のJSONファイル
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      ファイルを選択
                    </Button>
                  </div>
                </div>

                {importFile && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileJson className="w-4 h-4" />
                      <span className="font-medium">{importFile.name}</span>
                      <span className="text-muted-foreground">
                        ({(importFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    {importValidation && (
                      <div className="space-y-2">
                        {importValidation.errors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                {importValidation.errors.map((error, index) => (
                                  <div key={index}>• {error}</div>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        {importValidation.warnings.length > 0 && (
                          <Alert>
                            <Info className="w-4 h-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                {importValidation.warnings.map(
                                  (warning, index) => (
                                    <div key={index}>• {warning}</div>
                                  )
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        {importValidation.isValid &&
                          importValidation.projectPreview && (
                            <Alert>
                              <CheckCircle className="w-4 h-4" />
                              <AlertDescription>
                                <div className="space-y-1">
                                  <div>✅ ファイルの検証が完了しました</div>
                                  <div className="text-xs text-muted-foreground">
                                    プロジェクト:{' '}
                                    {importValidation.projectPreview.name}
                                    <br />
                                    ステップ数:{' '}
                                    {importValidation.projectPreview.steps
                                      ?.length || 0}
                                  </div>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}

                        <Button
                          onClick={handleImport}
                          disabled={!importValidation.isValid}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          インポート
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
