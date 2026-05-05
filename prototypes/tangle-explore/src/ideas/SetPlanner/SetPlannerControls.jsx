import React from 'react';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './SetPlannerControls.module.css';

function ToggleButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={[styles.toggleButton, active ? styles.toggleActive : ''].join(' ').trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function SetPlannerControls() {
  const setPlanner = useExploreStore((state) => state.setPlanner);
  const setSetPlanner = useExploreStore((state) => state.setSetPlanner);

  return (
    <div className={styles.root}>
      <div className={styles.group}>
        <div className={styles.label}>Show BPM Line</div>
        <div className={styles.segmented}>
          <ToggleButton
            active={setPlanner.showBpmLine}
            onClick={() => setSetPlanner({ showBpmLine: true })}
          >
            On
          </ToggleButton>
          <ToggleButton
            active={!setPlanner.showBpmLine}
            onClick={() => setSetPlanner({ showBpmLine: false })}
          >
            Off
          </ToggleButton>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.label}>Show Key</div>
        <div className={styles.segmented}>
          <ToggleButton active={setPlanner.showKey} onClick={() => setSetPlanner({ showKey: true })}>
            On
          </ToggleButton>
          <ToggleButton active={!setPlanner.showKey} onClick={() => setSetPlanner({ showKey: false })}>
            Off
          </ToggleButton>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.label}>Gap Threshold</div>
        <div className={styles.thresholdRow}>
          <input
            type="range"
            min="4"
            max="35"
            step="1"
            value={setPlanner.gapThreshold}
            onChange={(event) => setSetPlanner({ gapThreshold: Number(event.target.value) })}
          />
          <span className={styles.value}>{setPlanner.gapThreshold}</span>
        </div>
      </div>
    </div>
  );
}
