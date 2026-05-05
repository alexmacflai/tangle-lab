import React from 'react';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './IdeationCanvasControls.module.css';

const TOOL_OPTIONS = [
  { value: 'connect', label: 'Connect' },
  { value: 'move', label: 'Move' },
  { value: 'note', label: 'Note' }
];

export default function IdeationCanvasControls() {
  const ideationCanvas = useExploreStore((state) => state.ideationCanvas);
  const setIdeationCanvas = useExploreStore((state) => state.setIdeationCanvas);
  const triggerClear = useExploreStore((state) => state.triggerIdeationCanvasClear);
  const triggerCreatePlaylist = useExploreStore((state) => state.triggerIdeationCanvasCreatePlaylist);

  return (
    <div className={styles.root}>
      <div className={styles.group}>
        <div className={styles.label}>Tool Mode</div>
        <div className={styles.segmented}>
          {TOOL_OPTIONS.map((option) => {
            const isActive = ideationCanvas.toolMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={[styles.modeButton, isActive ? styles.activeMode : ''].join(' ').trim()}
                onClick={() => setIdeationCanvas({ toolMode: option.value })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.label}>Canvas</div>
        <button type="button" className={styles.actionButton} onClick={triggerClear}>
          Clear Canvas
        </button>
      </div>

      <div className={styles.group}>
        <div className={styles.label}>Playlist</div>
        <button type="button" className={styles.actionButton} onClick={triggerCreatePlaylist}>
          Create Playlist
        </button>
      </div>
    </div>
  );
}
