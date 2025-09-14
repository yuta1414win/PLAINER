/**
 * DOM操作関連のユーティリティ関数
 */

// 要素の表示状態を切り替え
export function toggleVisibility(element: HTMLElement, visible: boolean): void {
  if (visible) {
    element.style.display = '';
    element.removeAttribute('aria-hidden');
  } else {
    element.style.display = 'none';
    element.setAttribute('aria-hidden', 'true');
  }
}

// 要素が画面に表示されているかチェック
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// 要素を画面の中央にスクロール
export function scrollToCenter(
  element: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  const rect = element.getBoundingClientRect();
  const top =
    rect.top + window.pageYOffset - window.innerHeight / 2 + rect.height / 2;
  const left =
    rect.left + window.pageXOffset - window.innerWidth / 2 + rect.width / 2;

  window.scrollTo({
    top: Math.max(0, top),
    left: Math.max(0, left),
    behavior,
  });
}

// フォーカストラップの作成
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  const focusableElements = container.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
  ) as NodeListOf<HTMLElement>;

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }

  return {
    activate: () => {
      container.addEventListener('keydown', handleKeyDown);
      firstFocusable?.focus();
    },
    deactivate: () => {
      container.removeEventListener('keydown', handleKeyDown);
    },
  };
}

// 要素のサイズ変更を監視
export function observeResize(
  element: HTMLElement,
  callback: (entry: ResizeObserverEntry) => void
): () => void {
  if (!window.ResizeObserver) {
    console.warn('ResizeObserver is not supported');
    return () => {};
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      callback(entry);
    }
  });

  observer.observe(element);

  return () => observer.disconnect();
}

// クリップボードにコピー
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // フォールバック：テキストエリアを使用
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// ダウンロードリンクの作成
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // メモリリークを防ぐため、URLを解放
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// カスタムイベントの発火
export function dispatchCustomEvent(
  element: HTMLElement,
  eventName: string,
  detail?: unknown
): boolean {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true,
  });
  return element.dispatchEvent(event);
}
