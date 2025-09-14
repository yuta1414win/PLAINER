'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Monitor,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Globe,
  Camera,
  MousePointer,
  Settings,
} from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import {
  domCloneService,
  type DOMCaptureOptions,
  type DOMSnapshot,
} from '@/lib/dom-clone';
import { useTranslation } from './language-switcher';

interface DOMCloneProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DOMClone({ isOpen, onClose }: DOMCloneProps) {
  const { t } = useTranslation();
  const { project, addStep } = useEditorStore();
  const [url, setUrl] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<
    'idle' | 'capturing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState<DOMSnapshot | null>(null);
  const [captureOptions, setCaptureOptions] = useState<DOMCaptureOptions>({
    url: '',
    includeStyles: true,
    removeScripts: true,
    simplifyDOM: true,
    maxWidth: 1920,
    maxHeight: 1080,
  });

  const isSupported = domCloneService.isSupported();

  const handleCapture = useCallback(async () => {
    if (!url.trim()) {
      setErrorMessage('Please enter a valid URL');
      return;
    }

    setIsCapturing(true);
    setCaptureStatus('capturing');
    setErrorMessage('');

    try {
      const options: DOMCaptureOptions = {
        ...captureOptions,
        url: url.trim(),
      };

      // Check same-origin
      if (!domCloneService.isSameOrigin(url)) {
        throw new Error(t.domClone.sameOriginWarning);
      }

      const capturedSnapshot = await domCloneService.captureSnapshot(options);
      setSnapshot(capturedSnapshot);
      setCaptureStatus('success');
    } catch (error) {
      console.error('DOM capture failed:', error);
      setErrorMessage(
        error instanceof Error ? error.message : t.domClone.processingError
      );
      setCaptureStatus('error');
    } finally {
      setIsCapturing(false);
    }
  }, [url, captureOptions, t]);

  const handleCreateSteps = useCallback(async () => {
    if (!snapshot || !project) return;

    try {
      const steps = domCloneService.convertToSteps(snapshot, {
        createHotspotsFromInteractive: true,
        maxStepsPerPage: 3,
        groupBySection: true,
      });

      // Add steps to the project
      steps.forEach((stepData, index) => {
        const step = {
          id: `step-${Date.now()}-${index}`,
          title: stepData.title,
          image: stepData.image,
          hotspots: stepData.hotspots.map((h) => ({
            id: h.id,
            shape: h.shape,
            x: h.x,
            y: h.y,
            w: h.w,
            h: h.h,
            label: h.label,
            tooltipText: h.tooltipText,
          })),
          annotations: [],
          masks: [],
          order: (project.steps.length || 0) + index,
          description: stepData.description,
        };

        addStep(step);
      });

      onClose();
    } catch (error) {
      console.error('Failed to create steps:', error);
      setErrorMessage('Failed to create steps from snapshot');
    }
  }, [snapshot, project, addStep, onClose]);

  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setCaptureOptions((prev) => ({ ...prev, url: newUrl }));
    setCaptureStatus('idle');
    setSnapshot(null);
    setErrorMessage('');
  }, []);

  const getCurrentOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              {t.domClone.title}
            </DialogTitle>
          </DialogHeader>

          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {t.domClone.unsupportedBrowser}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button onClick={onClose}>{t.common.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <DialogTitle>{t.domClone.title}</DialogTitle>
            <Badge variant="outline" className="text-xs">
              Experimental
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{t.domClone.description}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* URL Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                {t.domClone.captureUrl}
              </CardTitle>
              <CardDescription>
                Enter the URL of the page you want to capture. Only same-origin
                pages are supported for security reasons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={`${getCurrentOrigin()}/example-page`}
                  disabled={isCapturing}
                />
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t.domClone.sameOriginWarning}</span>
                </div>
              </div>

              <Button
                onClick={handleCapture}
                disabled={isCapturing || !url.trim()}
                className="w-full"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.domClone.reconstructing}
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    {t.domClone.captureButton}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Capture Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Capture Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={captureOptions.includeStyles}
                    onChange={(e) =>
                      setCaptureOptions((prev) => ({
                        ...prev,
                        includeStyles: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Include Styles</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={captureOptions.removeScripts}
                    onChange={(e) =>
                      setCaptureOptions((prev) => ({
                        ...prev,
                        removeScripts: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Remove Scripts</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={captureOptions.simplifyDOM}
                    onChange={(e) =>
                      setCaptureOptions((prev) => ({
                        ...prev,
                        simplifyDOM: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Simplify DOM</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Status Messages */}
          {errorMessage && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {captureStatus === 'success' && snapshot && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Successfully captured {snapshot.elements.length} interactive
                elements from "{snapshot.metadata.title}"
              </AlertDescription>
            </Alert>
          )}

          {/* Snapshot Results */}
          {snapshot && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Captured Snapshot
                </CardTitle>
                <CardDescription>
                  Preview of captured elements and hotspot candidates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Snapshot Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Title:</strong> {snapshot.metadata.title}
                  </div>
                  <div>
                    <strong>URL:</strong> {snapshot.url}
                  </div>
                  <div>
                    <strong>Elements:</strong> {snapshot.elements.length}
                  </div>
                  <div>
                    <strong>Hotspot Candidates:</strong>{' '}
                    {
                      snapshot.elements.filter((el) => el.hotspotCandidate)
                        .length
                    }
                  </div>
                </div>

                {/* Screenshot Preview */}
                {snapshot.screenshot && (
                  <div className="space-y-2">
                    <strong className="text-sm">Screenshot Preview:</strong>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img
                        src={snapshot.screenshot}
                        alt="Page screenshot"
                        className="max-w-full max-h-40 object-contain mx-auto"
                      />
                    </div>
                  </div>
                )}

                {/* Interactive Elements */}
                {snapshot.elements.length > 0 && (
                  <div className="space-y-2">
                    <strong className="text-sm">
                      {t.domClone.selectElements}:
                    </strong>
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {snapshot.elements
                        .filter((el) => el.hotspotCandidate)
                        .map((element, index) => (
                          <div
                            key={element.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <MousePointer className="h-3 w-3" />
                              <span className="font-mono text-xs">
                                {element.tagName}
                              </span>
                              {element.text && (
                                <span className="truncate max-w-32">
                                  {element.text}
                                </span>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Hotspot
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Create Steps Button */}
                <Button
                  onClick={handleCreateSteps}
                  className="w-full"
                  disabled={
                    !snapshot.elements.some((el) => el.hotspotCandidate)
                  }
                >
                  {t.domClone.createHotspots} (
                  {snapshot.elements.filter((el) => el.hotspotCandidate).length}{' '}
                  elements)
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
