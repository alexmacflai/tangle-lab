import React from 'react';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './TimelineControls.module.css';

const VIEW_MODE_OPTIONS = [
  { value: 'streamgraph', label: 'Streamgraph' },
  { value: 'bpm-axis', label: 'BPM Axis' }
];

const GROUP_BY_OPTIONS = [
  { value: 'genre', label: 'Genre' },
  { value: 'tag', label: 'Tag' }
];

const COLOR_BY_OPTIONS = [
  { value: 'genre', label: 'Genre' },
  { value: 'source', label: 'Source' }
];

function SegmentedGroup({ label, options, value, onSelect }) {
  return (
    <div className={styles.group}>
      <div className={styles.label}>{label}</div>
      <div className={styles.segmented}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className={[styles.segmentButton, isActive ? styles.activeSegment : ''].join(' ').trim()}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TimelineControls() {
  const timeline = useExploreStore((state) => state.timeline);
  const setTimeline = useExploreStore((state) => state.setTimeline);

  return (
    <div className={styles.root}>
      <SegmentedGroup
        label="View Mode"
        options={VIEW_MODE_OPTIONS}
        value={timeline.viewMode}
        onSelect={(value) => setTimeline({ viewMode: value })}
      />
      <SegmentedGroup
        label="Group By"
        options={GROUP_BY_OPTIONS}
        value={timeline.groupBy}
        onSelect={(value) => setTimeline({ groupBy: value })}
      />
      <SegmentedGroup
        label="Color By"
        options={COLOR_BY_OPTIONS}
        value={timeline.colorBy}
        onSelect={(value) => setTimeline({ colorBy: value })}
      />
    </div>
  );
}
