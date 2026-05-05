import React from 'react';
import { useExploreStore } from '../store/useExploreStore';
import { getTracksForScope } from '../data/dataUtils';
import styles from './IdeaStub.module.css';

export function IdeaStub({ title, description, highlights = [] }) {
  const collection = useExploreStore((state) => state.collection);
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const tracks = getTracksForScope(collection, selectedPlaylistIds);

  return (
    <section className={styles.card}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Scoped Tracks</span>
          <strong>{tracks.length}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Playlists</span>
          <strong>{collection?.playlists?.length ?? 0}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Genres</span>
          <strong>{collection?.genres?.length ?? 0}</strong>
        </div>
      </div>
      {highlights.length ? (
        <ul className={styles.list}>
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function ControlsStub({ groups }) {
  return (
    <div className={styles.controlsRow}>
      {groups.map((group) => (
        <div key={group.label} className={styles.controlGroup}>
          <div className={styles.controlLabel}>{group.label}</div>
          <div className={styles.controlValue}>{group.value}</div>
        </div>
      ))}
    </div>
  );
}
