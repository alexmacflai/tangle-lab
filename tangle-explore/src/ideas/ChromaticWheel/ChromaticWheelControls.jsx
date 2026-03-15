import React from 'react';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './ChromaticWheelControls.module.css';

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={[styles.button, active ? styles.active : ''].join(' ').trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function ChromaticWheelControls() {
  const chromaticWheel = useExploreStore((state) => state.chromaticWheel);
  const setChromaticWheel = useExploreStore((state) => state.setChromaticWheel);

  return (
    <div className={styles.root}>
      <div className={styles.group}>
        <div className={styles.label}>View By</div>
        <div className={styles.row}>
          <ToggleButton
            active={chromaticWheel.viewBy === 'tracks'}
            onClick={() => setChromaticWheel({ viewBy: 'tracks' })}
          >
            Tracks
          </ToggleButton>
          <ToggleButton
            active={chromaticWheel.viewBy === 'playlists'}
            onClick={() => setChromaticWheel({ viewBy: 'playlists' })}
          >
            Playlists
          </ToggleButton>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.label}>Track Nodes</div>
        <div className={styles.row}>
          <ToggleButton
            active={chromaticWheel.showTrackNodes}
            onClick={() => setChromaticWheel({ showTrackNodes: true })}
          >
            On
          </ToggleButton>
          <ToggleButton
            active={!chromaticWheel.showTrackNodes}
            onClick={() => setChromaticWheel({ showTrackNodes: false })}
          >
            Off
          </ToggleButton>
        </div>
      </div>
    </div>
  );
}
