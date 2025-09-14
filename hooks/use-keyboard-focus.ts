'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type FocusZone = 'canvas' | 'properties' | 'steps' | 'toolbar' | 'main';

interface UseFocusZoneOptions {
  defaultZone?: FocusZone;
  onZoneChange?: (zone: FocusZone) => void;
}

export function useKeyboardFocus({
  defaultZone = 'canvas',
  onZoneChange,
}: UseFocusZoneOptions = {}) {
  const [currentZone, setCurrentZone] = useState<FocusZone>(defaultZone);
  const focusZoneRefs = useRef<Record<FocusZone, HTMLElement | null>>({
    canvas: null,
    properties: null,
    steps: null,
    toolbar: null,
    main: null,
  });

  // Register a focus zone element
  const registerZone = useCallback(
    (zone: FocusZone, element: HTMLElement | null) => {
      focusZoneRefs.current[zone] = element;

      if (element) {
        // Make element focusable if it isn't already
        if (!element.hasAttribute('tabindex')) {
          element.setAttribute('tabindex', '-1');
        }

        // Add focus styles
        element.style.outline = 'none';

        // Add focus and blur event listeners
        const handleFocus = () => {
          setCurrentZone(zone);
          element.style.boxShadow = '0 0 0 2px hsl(var(--ring))';
          element.setAttribute('aria-label', `${zone} zone focused`);
        };

        const handleBlur = () => {
          element.style.boxShadow = '';
          element.removeAttribute('aria-label');
        };

        element.addEventListener('focus', handleFocus);
        element.addEventListener('blur', handleBlur);

        return () => {
          element.removeEventListener('focus', handleFocus);
          element.removeEventListener('blur', handleBlur);
        };
      }
    },
    []
  );

  // Focus a specific zone
  const focusZone = useCallback(
    (zone: FocusZone) => {
      const element = focusZoneRefs.current[zone];
      if (element) {
        element.focus();
        setCurrentZone(zone);
        onZoneChange?.(zone);
      }
    },
    [onZoneChange]
  );

  // Navigate between zones
  const navigateZone = useCallback(
    (direction: 'next' | 'prev' | 'up' | 'down') => {
      const zones: FocusZone[] = [
        'toolbar',
        'steps',
        'canvas',
        'properties',
        'main',
      ];
      const currentIndex = zones.indexOf(currentZone);

      let nextIndex: number;

      switch (direction) {
        case 'next':
          nextIndex = (currentIndex + 1) % zones.length;
          break;
        case 'prev':
          nextIndex = (currentIndex - 1 + zones.length) % zones.length;
          break;
        case 'up':
          // Move to zones above current zone
          if (currentZone === 'properties') nextIndex = zones.indexOf('canvas');
          else if (currentZone === 'canvas') nextIndex = zones.indexOf('steps');
          else if (currentZone === 'steps')
            nextIndex = zones.indexOf('toolbar');
          else nextIndex = currentIndex;
          break;
        case 'down':
          // Move to zones below current zone
          if (currentZone === 'toolbar') nextIndex = zones.indexOf('steps');
          else if (currentZone === 'steps') nextIndex = zones.indexOf('canvas');
          else if (currentZone === 'canvas')
            nextIndex = zones.indexOf('properties');
          else nextIndex = currentIndex;
          break;
        default:
          return;
      }

      // Skip zones that aren't registered
      let attempts = 0;
      while (
        !focusZoneRefs.current[zones[nextIndex]] &&
        attempts < zones.length
      ) {
        if (direction === 'next' || direction === 'down') {
          nextIndex = (nextIndex + 1) % zones.length;
        } else {
          nextIndex = (nextIndex - 1 + zones.length) % zones.length;
        }
        attempts++;
      }

      if (attempts < zones.length) {
        focusZone(zones[nextIndex]);
      }
    },
    [currentZone, focusZone]
  );

  // Get the currently focused element within a zone
  const getFocusedElementInZone = useCallback((zone: FocusZone) => {
    const zoneElement = focusZoneRefs.current[zone];
    if (!zoneElement) return null;

    const focusedElement = document.activeElement;
    if (focusedElement && zoneElement.contains(focusedElement)) {
      return focusedElement as HTMLElement;
    }

    return null;
  }, []);

  // Navigate within a zone
  const navigateWithinZone = useCallback(
    (direction: 'next' | 'prev') => {
      const zoneElement = focusZoneRefs.current[currentZone];
      if (!zoneElement) return;

      const focusableElements = zoneElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const elements = Array.from(focusableElements) as HTMLElement[];
      if (elements.length === 0) return;

      const currentFocused = getFocusedElementInZone(currentZone);
      let nextIndex = 0;

      if (currentFocused) {
        const currentIndex = elements.indexOf(currentFocused);
        if (currentIndex !== -1) {
          if (direction === 'next') {
            nextIndex = (currentIndex + 1) % elements.length;
          } else {
            nextIndex = (currentIndex - 1 + elements.length) % elements.length;
          }
        }
      }

      elements[nextIndex]?.focus();
    },
    [currentZone, getFocusedElementInZone]
  );

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        e.target &&
        (e.target as HTMLElement).tagName &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement).tagName
        )
      ) {
        return;
      }

      // Zone navigation shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            focusZone('toolbar');
            break;
          case '2':
            e.preventDefault();
            focusZone('steps');
            break;
          case '3':
            e.preventDefault();
            focusZone('canvas');
            break;
          case '4':
            e.preventDefault();
            focusZone('properties');
            break;
          case '5':
            e.preventDefault();
            focusZone('main');
            break;
        }
        return;
      }

      // Tab navigation between zones
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          e.preventDefault();
          navigateZone('prev');
        } else {
          e.preventDefault();
          navigateZone('next');
        }
        return;
      }

      // Arrow key navigation
      if (e.altKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            navigateZone('prev');
            break;
          case 'ArrowRight':
            e.preventDefault();
            navigateZone('next');
            break;
          case 'ArrowUp':
            e.preventDefault();
            navigateZone('up');
            break;
          case 'ArrowDown':
            e.preventDefault();
            navigateZone('down');
            break;
        }
        return;
      }

      // Navigation within zone
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        navigateWithinZone('next');
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateWithinZone('prev');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigateZone, navigateWithinZone, focusZone]);

  return {
    currentZone,
    registerZone,
    focusZone,
    navigateZone,
    navigateWithinZone,
    getFocusedElementInZone,
  };
}

export type { FocusZone };
