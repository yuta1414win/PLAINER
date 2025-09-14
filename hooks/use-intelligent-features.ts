"use client";

import { useCallback } from 'react';
import { detectUIElementsFromImage } from '@/lib/ai/image-element-detector';
import { evaluateHotspotAccessibility } from '@/lib/ai/accessibility';
import { translateLocal } from '@/lib/ai/translator';

export function useIntelligentFeatures() {
  const suggestHotspots = useCallback(async (img: HTMLImageElement) => {
    return detectUIElementsFromImage(img);
  }, []);

  const checkAccessibility = useCallback(
    (params: {
      hotspotWidthPx: number;
      hotspotHeightPx: number;
      hotspotColor?: string;
      backgroundColor?: string;
    }) => {
      return evaluateHotspotAccessibility({
        hotspotWidthPx: params.hotspotWidthPx,
        hotspotHeightPx: params.hotspotHeightPx,
        hotspotColor: (params.hotspotColor || '#ef4444') as any,
        backgroundColor: (params.backgroundColor || '#ffffff') as any,
      });
    },
    []
  );

  const translate = useCallback(
    (text: string, to: 'ja' | 'en', from?: 'ja' | 'en') => {
      return translateLocal(text, to, from);
    },
    []
  );

  return { suggestHotspots, checkAccessibility, translate };
}

