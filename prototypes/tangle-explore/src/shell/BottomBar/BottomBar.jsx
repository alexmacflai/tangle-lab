import React, { Suspense, useEffect, useRef } from 'react';
import styles from './BottomBar.module.css';

export function BottomBar({ idea }) {
  const Controls = idea?.controls ?? null;
  const contentRef = useRef(null);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return undefined;

    const syncRange = (rangeInput) => {
      const min = Number(rangeInput.min || 0);
      const max = Number(rangeInput.max || 100);
      const value = Number(rangeInput.value || min);
      const span = max - min;
      const progress = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
      rangeInput.style.setProperty('--slider-progress', `${progress}%`);
    };

    const syncAllRanges = () => {
      const ranges = contentEl.querySelectorAll("input[type='range']");
      ranges.forEach((range) => syncRange(range));
    };

    const onInput = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'range') return;
      syncRange(target);
    };

    syncAllRanges();
    contentEl.addEventListener('input', onInput, true);

    return () => {
      contentEl.removeEventListener('input', onInput, true);
    };
  }, [idea?.id]);

  if (!Controls) {
    return <div className={styles.hidden} />;
  }

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <Suspense fallback={<div className={styles.fallback}>Loading controls...</div>}>
          <div className={styles.content} ref={contentRef}>
            <Controls />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
