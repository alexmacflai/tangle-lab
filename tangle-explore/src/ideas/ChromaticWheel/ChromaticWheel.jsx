import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getTracksForScope, keyNoteToCamelot } from '../../data/dataUtils';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './ChromaticWheel.module.css';

const SEGMENTS = Array.from({ length: 24 }, (_, index) => {
  const number = (index % 12) + 1;
  const letter = index < 12 ? 'A' : 'B';
  return {
    index,
    number,
    letter,
    key: `${number}${letter}`
  };
});

function hash32(input) {
  const value = String(input);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isAdjacent(segmentA, segmentB) {
  const aIndex = SEGMENTS.find((segment) => segment.key === segmentA)?.index;
  const bIndex = SEGMENTS.find((segment) => segment.key === segmentB)?.index;
  if (aIndex === undefined || bIndex === undefined) return false;

  const diff = Math.abs(aIndex - bIndex);
  return diff === 1 || diff === SEGMENTS.length - 1;
}

function segmentColor(segment, intensity = 0.45) {
  const hue = ((segment.number - 1) / 12) * 360;
  const lightness = segment.letter === 'A' ? 47 : 59;
  const alpha = 0.2 + intensity * 0.7;
  return `hsla(${hue}, 76%, ${lightness}%, ${alpha})`;
}

function toTrackTitle(track) {
  const value = track.title_display ?? track.title;
  if (value === null || value === undefined || value === '') return `track:${track.track_id}`;
  return String(value);
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function buildWheelData(collection, tracks, viewBy) {
  const tracksBySegment = new Map(SEGMENTS.map((segment) => [segment.key, []]));
  const trackCountBySegment = new Map(SEGMENTS.map((segment) => [segment.key, 0]));

  const playlistIdsByTrack = new Map();
  for (const relation of collection.trackPlaylists) {
    const bucket = playlistIdsByTrack.get(relation.track_id) ?? new Set();
    bucket.add(relation.playlist_id);
    playlistIdsByTrack.set(relation.track_id, bucket);
  }

  const playlistCountBySegment = new Map(SEGMENTS.map((segment) => [segment.key, new Set()]));
  const unkeyedTracks = [];

  for (const track of tracks) {
    const camelot = keyNoteToCamelot(track.key_note);
    if (!camelot) {
      unkeyedTracks.push(track);
      continue;
    }

    const key = `${camelot.number}${camelot.letter}`;
    if (!tracksBySegment.has(key)) {
      unkeyedTracks.push(track);
      continue;
    }

    const segmentTracks = tracksBySegment.get(key);
    segmentTracks.push(track);
    trackCountBySegment.set(key, segmentTracks.length);

    const playlistSet = playlistCountBySegment.get(key);
    const trackPlaylists = playlistIdsByTrack.get(track.track_id) ?? new Set();
    for (const playlistId of trackPlaylists) {
      playlistSet.add(playlistId);
    }
  }

  const maxTrackCount = Math.max(1, ...[...trackCountBySegment.values()]);
  const maxPlaylistCount = Math.max(1, ...[...playlistCountBySegment.values()].map((value) => value.size));

  const segments = SEGMENTS.map((segment) => {
    const trackCount = trackCountBySegment.get(segment.key) ?? 0;
    const playlistCount = playlistCountBySegment.get(segment.key)?.size ?? 0;
    const value = viewBy === 'playlists' ? playlistCount : trackCount;
    const maxValue = viewBy === 'playlists' ? maxPlaylistCount : maxTrackCount;
    const normalized = value / Math.max(1, maxValue);

    return {
      ...segment,
      trackCount,
      playlistCount,
      value,
      normalized,
      tracks: tracksBySegment.get(segment.key) ?? []
    };
  });

  return {
    segments,
    unkeyedTracks,
    maxValue: viewBy === 'playlists' ? maxPlaylistCount : maxTrackCount
  };
}

export default function ChromaticWheel() {
  const collection = useExploreStore((state) => state.collection);
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const chromaticWheel = useExploreStore((state) => state.chromaticWheel);

  const tracks = useMemo(
    () => getTracksForScope(collection, selectedPlaylistIds),
    [collection, selectedPlaylistIds]
  );

  const wheelData = useMemo(
    () => buildWheelData(collection, tracks, chromaticWheel.viewBy),
    [collection, tracks, chromaticWheel.viewBy]
  );

  const [selectedSegments, setSelectedSegments] = useState([]);
  const [selectionMode, setSelectionMode] = useState('segment');

  useEffect(() => {
    setSelectedSegments([]);
    setSelectionMode('segment');
  }, [chromaticWheel.viewBy, selectedPlaylistIds]);

  const containerRef = useRef(null);
  const size = useElementSize(containerRef);

  const side = Math.max(280, Math.min(size.width - 20, size.height - 20));
  const center = side / 2;
  const outerRadius = side * 0.46;
  const innerRadius = side * 0.23;
  const nodeRadius = (outerRadius + innerRadius) / 2;
  const segmentAngle = (Math.PI * 2) / SEGMENTS.length;

  const arc = useMemo(
    () =>
      d3
        .arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(2),
    [innerRadius, outerRadius]
  );

  const selectedSet = new Set(selectedSegments);
  const activeSegments =
    selectedSegments.length === 2
      ? wheelData.segments.filter((segment) => selectedSet.has(segment.key))
      : selectedSegments.length === 1
        ? wheelData.segments.filter((segment) => segment.key === selectedSegments[0])
        : [];

  const selectedTracks = useMemo(() => {
    if (selectionMode === 'unkeyed') {
      return wheelData.unkeyedTracks;
    }

    if (!activeSegments.length) {
      return [];
    }

    const idSet = new Set();
    const list = [];
    for (const segment of activeSegments) {
      for (const track of segment.tracks) {
        if (idSet.has(track.track_id)) continue;
        idSet.add(track.track_id);
        list.push(track);
      }
    }

    return list;
  }, [activeSegments, selectionMode, wheelData.unkeyedTracks]);

  function onSegmentClick(segment, event) {
    if (event.shiftKey) {
      setSelectionMode('segment');
      setSelectedSegments((current) => {
        if (current.length === 1) {
          if (current[0] === segment.key) return current;
          if (isAdjacent(current[0], segment.key)) {
            return [current[0], segment.key];
          }
          return [segment.key];
        }

        if (current.length === 2) {
          return [segment.key];
        }

        return [segment.key];
      });
      return;
    }

    setSelectionMode('segment');
    setSelectedSegments((current) => (current.length === 1 && current[0] === segment.key ? [] : [segment.key]));
  }

  function selectUnkeyed() {
    setSelectionMode('unkeyed');
    setSelectedSegments([]);
  }

  function createPlaylistFromSelection() {
    if (!selectedTracks.length) {
      window.alert('Select a segment first.');
      return;
    }

    const preview = selectedTracks
      .slice(0, 8)
      .map((track) => toTrackTitle(track))
      .join(', ');
    const overflow = selectedTracks.length > 8 ? ` +${selectedTracks.length - 8} more` : '';

    window.alert(
      `Prototype action: create playlist with ${selectedTracks.length} tracks.\n${preview}${overflow}`
    );
  }

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Chromatic Wheel</div>
          <div className={styles.subtitle}>
            {tracks.length} tracks in scope · {chromaticWheel.viewBy === 'playlists' ? 'Playlist richness' : 'Track density'}
          </div>
        </div>
        <button type="button" className={styles.unkeyedButton} onClick={selectUnkeyed}>
          Unkeyed: {wheelData.unkeyedTracks.length}
        </button>
      </div>

      <div className={styles.body}>
        <div ref={containerRef} className={styles.wheelWrap}>
          {size.width > 0 && size.height > 0 ? (
            <svg width={side} height={side} viewBox={`0 0 ${side} ${side}`}>
              <g transform={`translate(${center}, ${center})`}>
                {wheelData.segments.map((segment) => {
                  const startAngle = -Math.PI / 2 + segment.index * segmentAngle;
                  const endAngle = startAngle + segmentAngle;
                  const d = arc({ startAngle, endAngle });
                  const isSelected = selectedSet.has(segment.key);
                  const isDimmed = selectedSegments.length > 0 && !isSelected;
                  const fill = segmentColor(segment, segment.normalized);

                  const labelAngle = startAngle + segmentAngle / 2;
                  const labelRadius = outerRadius + 18;
                  const lx = Math.cos(labelAngle) * labelRadius;
                  const ly = Math.sin(labelAngle) * labelRadius;

                  return (
                    <g key={segment.key}>
                      <path
                        d={d}
                        fill={fill}
                        stroke={isSelected ? '#AB3DFF' : '#2B465F'}
                        strokeWidth={isSelected ? 2 : 1}
                        opacity={isDimmed ? 0.18 : 1}
                        onClick={(event) => onSegmentClick(segment, event)}
                        style={{ cursor: 'pointer' }}
                      />

                      {chromaticWheel.showTrackNodes
                        ? segment.tracks.slice(0, 18).map((track, index) => {
                            const jitter = (hash32(`${segment.key}:${track.track_id}`) % 1000) / 1000;
                            const radius = innerRadius + 10 + jitter * (outerRadius - innerRadius - 20);
                            const angle = startAngle + ((index + 1) / (segment.tracks.length + 1)) * segmentAngle;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            return <circle key={`${segment.key}:${track.track_id}`} cx={x} cy={y} r="2.2" fill="#FFFFFF" opacity={0.72} />;
                          })
                        : null}

                      <text x={lx} y={ly} className={styles.segmentLabel} textAnchor="middle" dominantBaseline="middle">
                        {segment.key}
                      </text>
                    </g>
                  );
                })}

                <circle r={innerRadius - 12} fill="#071B2E" stroke="#2B465F" />
                <text y={-6} className={styles.centerTop} textAnchor="middle">{chromaticWheel.viewBy === 'playlists' ? 'Playlist Count' : 'Track Count'}</text>
                <text y={14} className={styles.centerValue} textAnchor="middle">{wheelData.maxValue}</text>
              </g>
            </svg>
          ) : null}
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelTitle}>Selection</div>
          <div className={styles.panelSubtitle}>
            {selectionMode === 'unkeyed'
              ? 'Unkeyed Tracks'
              : selectedSegments.length === 2
                ? `${selectedSegments[0]} + ${selectedSegments[1]} (adjacent blend)`
                : selectedSegments.length === 1
                  ? selectedSegments[0]
                  : 'Select a segment (Shift+Click for adjacent pair)' }
          </div>

          <div className={styles.selectionMeta}>{selectedTracks.length} tracks</div>

          <button type="button" className={styles.createButton} onClick={createPlaylistFromSelection}>
            Create Playlist
          </button>

          <div className={styles.trackList}>
            {selectedTracks.slice(0, 30).map((track) => (
              <div key={track.track_id} className={styles.trackRow}>
                <div className={styles.trackTitle}>{toTrackTitle(track)}</div>
                <div className={styles.trackMeta}>
                  {track.bpm ? `${track.bpm} BPM` : 'BPM ?'} · {track.key_note !== null && track.key_note !== undefined ? `key ${track.key_note}` : 'key ?'}
                </div>
              </div>
            ))}
            {!selectedTracks.length ? <div className={styles.empty}>No tracks selected.</div> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
