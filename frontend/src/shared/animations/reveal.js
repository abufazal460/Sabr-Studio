import { useEffect, useRef } from 'react';
import { useAnimationControls, useInView, useReducedMotion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Shared Home reveal system — single source of truth for repeated animation
// behavior across Home + About (clip-slide language, fade-up entries).
// GPU-friendly (transform/clip/opacity only), fires once, stable after.
// ---------------------------------------------------------------------------

export const CLIP_HIDDEN = {
  left: { x: '-10%', clipPath: 'inset(0 100% 0 0)', opacity: 0 },
  right: { x: '10%', clipPath: 'inset(0 0 0 100%)', opacity: 0 },
};
export const CLIP_OPEN = { x: '0%', clipPath: 'inset(0 0% 0 0%)', opacity: 1 };
export const CLIP_TRANSITION = { duration: 0.75, ease: [0.25, 0.1, 0.25, 1] };

/**
 * Clip-slide reveal: element slides in clipped, lands, stays permanently.
 * Fires once on first entry into viewport. Content is visible by default when
 * reduced motion is on or before observation — never stranded invisible.
 */
export const useClipReveal = (dir = 'left', amount = 0.2) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const controls = useAnimationControls();
  const inView = useInView(ref, { once: true, amount });

  useEffect(() => {
    if (reduce || !inView) return undefined;

    controls.set(CLIP_HIDDEN[dir]);
    controls.start({ ...CLIP_OPEN, transition: CLIP_TRANSITION });

    const failsafe = setTimeout(() => {
      const el = ref.current;
      if (el) {
        el.style.clipPath = '';
        el.style.transform = '';
        el.style.opacity = '';
      }
    }, 1500);

    return () => clearTimeout(failsafe);
  }, [reduce, inView, dir, controls]);

  return { ref, controls };
};

/**
 * Fade-up entry for section content: opacity 0 -> 1, y 20 -> 0, fires once
 * via whileInView. Returns {} under reduced motion (content stays visible).
 */
export const fadeUpProps = (reduce, delay = 0, y = 20, amount = 0.2) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount },
        transition: { duration: 0.55, ease: 'easeOut', delay },
      };

/**
 * Mount-only fade for above-the-fold content (e.g. Hero): plays once on mount
 * via `animate` — never scroll-linked, never replays on scroll.
 */
export const mountFadeProps = (reduce, delay = 0, y = 18) =>
  reduce
    ? {
        initial: false,
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut', delay },
      };

export default useClipReveal;
