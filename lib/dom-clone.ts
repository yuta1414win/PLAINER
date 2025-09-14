/**
 * DOM Clone Experimental Feature
 * Captures DOM snapshots from web pages and converts them to steps
 */

export interface DOMCaptureOptions {
  url: string;
  selector?: string;
  includeStyles?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  removeScripts?: boolean;
  simplifyDOM?: boolean;
}

export interface CapturedElement {
  id: string;
  tagName: string;
  selector: string;
  boundingRect: DOMRect;
  text?: string;
  attributes: Record<string, string>;
  styles?: CSSStyleDeclaration;
  screenshot?: string;
  isInteractive: boolean;
  hotspotCandidate: boolean;
}

export interface DOMSnapshot {
  url: string;
  timestamp: Date;
  viewport: { width: number; height: number };
  screenshot: string;
  elements: CapturedElement[];
  html: string;
  styles: string;
  metadata: {
    title: string;
    description?: string;
    charset: string;
    language: string;
  };
}

export class DOMCloneService {
  private iframe: HTMLIFrameElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Check if DOM capture is supported in current browser
   */
  isSupported(): boolean {
    try {
      // Check for required APIs
      return !!(
        window.HTMLCanvasElement &&
        window.CanvasRenderingContext2D &&
        window.MutationObserver &&
        document.createElement('iframe') &&
        'getSelection' in window
      );
    } catch (error) {
      console.error('DOM capture support check failed:', error);
      return false;
    }
  }

  /**
   * Check if URL is same-origin
   */
  isSameOrigin(url: string): boolean {
    try {
      const targetURL = new URL(url);
      const currentURL = new URL(window.location.href);
      return targetURL.origin === currentURL.origin;
    } catch (error) {
      console.error('Same-origin check failed:', error);
      return false;
    }
  }

  /**
   * Capture DOM snapshot from current page or iframe
   */
  async captureSnapshot(options: DOMCaptureOptions): Promise<DOMSnapshot> {
    if (!this.isSupported()) {
      throw new Error('DOM capture is not supported in this browser');
    }

    let targetDocument: Document;
    let targetWindow: Window;

    if (options.url && options.url !== window.location.href) {
      if (!this.isSameOrigin(options.url)) {
        throw new Error(
          'Cross-origin DOM capture is not allowed for security reasons'
        );
      }

      // Load in iframe for same-origin URLs
      const { document: iframeDoc, window: iframeWin } =
        await this.loadInIframe(options.url);
      targetDocument = iframeDoc;
      targetWindow = iframeWin;
    } else {
      targetDocument = document;
      targetWindow = window;
    }

    // Capture screenshot
    const screenshot = await this.captureScreenshot(
      targetDocument,
      targetWindow
    );

    // Extract elements
    const elements = await this.extractElements(targetDocument, options);

    // Get HTML and styles
    const html = await this.extractHTML(targetDocument, options);
    const styles = await this.extractStyles(targetDocument);

    // Extract metadata
    const metadata = this.extractMetadata(targetDocument);

    const snapshot: DOMSnapshot = {
      url: options.url,
      timestamp: new Date(),
      viewport: {
        width: targetWindow.innerWidth,
        height: targetWindow.innerHeight,
      },
      screenshot,
      elements,
      html,
      styles,
      metadata,
    };

    // Cleanup
    this.cleanup();

    return snapshot;
  }

  /**
   * Load URL in iframe
   */
  private async loadInIframe(
    url: string
  ): Promise<{ document: Document; window: Window }> {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1024px';
      iframe.style.height = '768px';
      iframe.style.border = 'none';

      iframe.onload = () => {
        try {
          const iframeWindow = iframe.contentWindow;
          const iframeDocument = iframe.contentDocument;

          if (!iframeWindow || !iframeDocument) {
            throw new Error('Failed to access iframe content');
          }

          this.iframe = iframe;
          resolve({ document: iframeDocument, window: iframeWindow });
        } catch (error) {
          reject(
            new Error('Failed to load iframe: ' + (error as Error).message)
          );
        }
      };

      iframe.onerror = () => {
        reject(new Error('Failed to load iframe'));
      };

      document.body.appendChild(iframe);
      iframe.src = url;

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 10000);
    });
  }

  /**
   * Capture screenshot using html2canvas-like approach
   */
  private async captureScreenshot(doc: Document, win: Window): Promise<string> {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = win.innerWidth;
      canvas.height = win.innerHeight;

      // Simple fallback: render document body background
      ctx.fillStyle =
        win.getComputedStyle(doc.body).backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add text indicating this is a simplified capture
      ctx.fillStyle = '#666666';
      ctx.font = '14px Arial';
      ctx.fillText('DOM Snapshot - Simplified Capture', 20, 40);
      ctx.fillText(`URL: ${doc.location?.href || 'Unknown'}`, 20, 60);
      ctx.fillText(`Captured: ${new Date().toLocaleString()}`, 20, 80);

      this.canvas = canvas;
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // Return placeholder image
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 768;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333333';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Screenshot not available',
        canvas.width / 2,
        canvas.height / 2
      );
      return canvas.toDataURL('image/png');
    }
  }

  /**
   * Extract interactive elements from DOM
   */
  private async extractElements(
    doc: Document,
    options: DOMCaptureOptions
  ): Promise<CapturedElement[]> {
    const elements: CapturedElement[] = [];
    const rootElement = options.selector
      ? doc.querySelector(options.selector)
      : doc.body;

    if (!rootElement) {
      return elements;
    }

    // Interactive element selectors
    const interactiveSelectors = [
      'a[href]',
      'button',
      'input[type="button"]',
      'input[type="submit"]',
      'input[type="reset"]',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'select',
      'textarea',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      '[onclick]',
      '[onmousedown]',
      '[onmouseup]',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    // Find all interactive elements
    interactiveSelectors.forEach((selector) => {
      const matchedElements = rootElement.querySelectorAll(selector);
      matchedElements.forEach((element, index) => {
        try {
          const boundingRect = element.getBoundingClientRect();

          // Skip elements that are not visible
          if (boundingRect.width === 0 || boundingRect.height === 0) {
            return;
          }

          const capturedElement: CapturedElement = {
            id: `element-${Date.now()}-${index}`,
            tagName: element.tagName.toLowerCase(),
            selector: this.generateSelector(element),
            boundingRect: {
              x: boundingRect.x,
              y: boundingRect.y,
              width: boundingRect.width,
              height: boundingRect.height,
              top: boundingRect.top,
              right: boundingRect.right,
              bottom: boundingRect.bottom,
              left: boundingRect.left,
              toJSON: boundingRect.toJSON,
            },
            text: element.textContent?.trim() || '',
            attributes: this.extractAttributes(element),
            isInteractive: true,
            hotspotCandidate: this.isHotspotCandidate(element),
          };

          if (options.includeStyles) {
            capturedElement.styles = window.getComputedStyle(element);
          }

          elements.push(capturedElement);
        } catch (error) {
          console.error('Failed to process element:', error);
        }
      });
    });

    return elements;
  }

  /**
   * Generate unique CSS selector for element
   */
  private generateSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.className) {
        selector += '.' + current.className.split(' ').join('.');
      }

      const siblings = current.parentElement?.children;
      if (siblings && siblings.length > 1) {
        const index = Array.from(siblings).indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Extract element attributes
   */
  private extractAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    return attributes;
  }

  /**
   * Determine if element is a good hotspot candidate
   */
  private isHotspotCandidate(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();

    // Primary candidates
    if (['button', 'a'].includes(tagName)) {
      return true;
    }

    // Input elements
    if (tagName === 'input') {
      const type = element.getAttribute('type') || 'text';
      return ['button', 'submit', 'reset'].includes(type);
    }

    // Elements with click handlers
    if (
      element.getAttribute('onclick') ||
      element.getAttribute('role') === 'button'
    ) {
      return true;
    }

    // Large enough elements with text
    const rect = element.getBoundingClientRect();
    const hasText = element.textContent?.trim().length || 0 > 2;
    const isLargeEnough = rect.width > 20 && rect.height > 20;

    return hasText && isLargeEnough;
  }

  /**
   * Extract and clean HTML
   */
  private async extractHTML(
    doc: Document,
    options: DOMCaptureOptions
  ): Promise<string> {
    let html = doc.documentElement.outerHTML;

    if (options.removeScripts) {
      // Remove script tags
      html = html.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ''
      );
      // Remove event attributes
      html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    }

    if (options.simplifyDOM) {
      // Remove comments
      html = html.replace(/<!--[\s\S]*?-->/g, '');
      // Remove data attributes
      html = html.replace(/\s*data-[\w-]+\s*=\s*["'][^"']*["']/gi, '');
      // Simplify classes
      html = html.replace(
        /class\s*=\s*["']([^"']+)["']/gi,
        (match, classes) => {
          const simplified = classes
            .split(' ')
            .filter(
              (cls: string) =>
                !cls.includes('js-') &&
                !cls.includes('tracking-') &&
                cls.length < 50
            )
            .slice(0, 5)
            .join(' ');
          return simplified ? `class="${simplified}"` : '';
        }
      );
    }

    return html;
  }

  /**
   * Extract CSS styles
   */
  private async extractStyles(doc: Document): Promise<string> {
    let styles = '';

    // Extract inline styles
    const styleElements = doc.querySelectorAll('style');
    styleElements.forEach((style) => {
      styles += style.innerHTML + '\n';
    });

    // Extract linked stylesheets (same-origin only)
    const linkElements = doc.querySelectorAll('link[rel="stylesheet"]');
    for (const link of linkElements) {
      try {
        const href = (link as HTMLLinkElement).href;
        if (this.isSameOrigin(href)) {
          const response = await fetch(href);
          if (response.ok) {
            styles += (await response.text()) + '\n';
          }
        }
      } catch (error) {
        console.error('Failed to fetch stylesheet:', error);
      }
    }

    return styles;
  }

  /**
   * Extract page metadata
   */
  private extractMetadata(doc: Document): DOMSnapshot['metadata'] {
    return {
      title: doc.title || 'Untitled',
      description:
        doc
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') || undefined,
      charset: doc.characterSet || 'utf-8',
      language: doc.documentElement.lang || 'en',
    };
  }

  /**
   * Convert DOM snapshot to steps
   */
  convertToSteps(
    snapshot: DOMSnapshot,
    options: {
      createHotspotsFromInteractive?: boolean;
      maxStepsPerPage?: number;
      groupBySection?: boolean;
    } = {}
  ): Array<{
    title: string;
    image: string;
    hotspots: Array<{
      id: string;
      shape: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      label?: string;
      tooltipText?: string;
    }>;
    description?: string;
  }> {
    const steps: Array<any> = [];

    // Create main step with page screenshot
    const mainStep = {
      title: snapshot.metadata.title,
      image: snapshot.screenshot,
      hotspots: [],
      description: `Captured from ${snapshot.url}`,
    };

    // Add hotspots from interactive elements
    if (options.createHotspotsFromInteractive) {
      const hotspotCandidates = snapshot.elements.filter(
        (el) => el.hotspotCandidate
      );

      hotspotCandidates.forEach((element, index) => {
        const rect = element.boundingRect;
        const hotspot = {
          id: `hotspot-${index}`,
          shape: 'rect' as const,
          x: rect.x / snapshot.viewport.width,
          y: rect.y / snapshot.viewport.height,
          w: rect.width / snapshot.viewport.width,
          h: rect.height / snapshot.viewport.height,
          label: element.text || element.tagName,
          tooltipText: `${element.tagName}: ${element.text || 'Interactive element'}`,
        };

        mainStep.hotspots.push(hotspot);
      });
    }

    steps.push(mainStep);

    // Group elements by sections if requested
    if (
      options.groupBySection &&
      options.maxStepsPerPage &&
      options.maxStepsPerPage > 1
    ) {
      const sections = this.groupElementsBySection(snapshot.elements);

      sections
        .slice(0, options.maxStepsPerPage - 1)
        .forEach((section, index) => {
          const sectionStep = {
            title: `${snapshot.metadata.title} - Section ${index + 1}`,
            image: snapshot.screenshot, // Could be cropped to section
            hotspots: section.elements.map((element, idx) => ({
              id: `section-${index}-hotspot-${idx}`,
              shape: 'rect' as const,
              x: element.boundingRect.x / snapshot.viewport.width,
              y: element.boundingRect.y / snapshot.viewport.height,
              w: element.boundingRect.width / snapshot.viewport.width,
              h: element.boundingRect.height / snapshot.viewport.height,
              label: element.text || element.tagName,
              tooltipText: element.text || `${element.tagName} element`,
            })),
            description: `Section with ${section.elements.length} interactive elements`,
          };

          steps.push(sectionStep);
        });
    }

    return steps;
  }

  /**
   * Group elements by visual sections
   */
  private groupElementsBySection(elements: CapturedElement[]): Array<{
    name: string;
    elements: CapturedElement[];
  }> {
    // Simple grouping by Y position
    const sections: Array<{ name: string; elements: CapturedElement[] }> = [];
    const sortedElements = [...elements].sort(
      (a, b) => a.boundingRect.y - b.boundingRect.y
    );

    let currentSection: { name: string; elements: CapturedElement[] } | null =
      null;
    let currentY = 0;
    const sectionThreshold = 100; // pixels

    sortedElements.forEach((element, index) => {
      if (
        !currentSection ||
        element.boundingRect.y - currentY > sectionThreshold
      ) {
        currentSection = {
          name: `Section ${sections.length + 1}`,
          elements: [element],
        };
        sections.push(currentSection);
        currentY = element.boundingRect.y;
      } else {
        currentSection.elements.push(element);
      }
    });

    return sections;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.canvas) {
      this.canvas = null;
    }
  }
}

export const domCloneService = new DOMCloneService();
