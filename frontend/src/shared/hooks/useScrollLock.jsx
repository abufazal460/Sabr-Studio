import { useCallback, useEffect, useRef } from 'react';

/**
 * Reference-counted body scroll lock for admin modals.
 *
 * When the first modal opens:
 *   - Saves the previous <html>/<body> overflow values and the current scroll position.
 *   - Sets overflow: hidden on <html> and <body> so the background page cannot move.
 *
 * When the last modal closes:
 *   - Restores the previous overflow values.
 *   - Restores the exact scroll position (window.scrollTo), so the background page
 *     is exactly where the user left it.
 *
 * A global Escape keydown listener (active only while a modal is open) invokes
 * onEscape so consumers can close all open modals with the keyboard.
 *
 * On unmount the lock is force-released so the body is never left permanently
 * locked (e.g. navigating away with a modal still open).
 *
 * @param {Object} options
 * @param {Function} [options.onEscape] - Called when Escape is pressed with a modal open.
 * @returns {{ lock: Function, unlock: Function, forceUnlock: Function, isLocked: boolean }}
 */
export function useScrollLock({ onEscape } = {}) {
  const count = useRef(0);
  const savedHtmlOverflow = useRef('');
  const savedBodyOverflow = useRef('');
  const savedScrollY = useRef(0);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  const lock = useCallback(() => {
    count.current += 1;
    if (count.current === 1) {
      savedHtmlOverflow.current = document.documentElement.style.overflow;
      savedBodyOverflow.current = document.body.style.overflow;
      savedScrollY.current = typeof window.scrollY === 'number' ? window.scrollY : 0;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  }, []);

  const unlock = useCallback(() => {
    if (count.current <= 0) return;
    count.current -= 1;
    if (count.current === 0) {
      document.documentElement.style.overflow = savedHtmlOverflow.current;
      document.body.style.overflow = savedBodyOverflow.current;
      savedHtmlOverflow.current = '';
      savedBodyOverflow.current = '';
      const y = savedScrollY.current;
      try {
        window.scrollTo(0, y);
      } catch {}
    }
  }, []);

  const forceUnlock = useCallback(() => {
    if (count.current <= 0) return;
    count.current = 0;
    document.documentElement.style.overflow = savedHtmlOverflow.current;
    document.body.style.overflow = savedBodyOverflow.current;
    savedHtmlOverflow.current = '';
    savedBodyOverflow.current = '';
    const y = savedScrollY.current;
    try {
      window.scrollTo(0, y);
    } catch {}
  }, []);

  useEffect(() => {
    const onKeydown = (event) => {
      if (
        event.key === 'Escape' &&
        count.current > 0 &&
        typeof onEscapeRef.current === 'function'
      ) {
        onEscapeRef.current();
      }
    };
    document.addEventListener('keydown', onKeydown, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKeydown);
      forceUnlock();
    };
  }, [forceUnlock]);

  return { lock, unlock, forceUnlock, isLocked: count.current > 0 };
}

export default useScrollLock;
