import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getTracksForScope, keyNoteToCamelot } from '../../data/dataUtils';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './SetPlanner.module.css';

const ITEM_GAP = 12;
const OVERLAY_HEIGHT = 52;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.floor(seconds % 60));
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function toTitle(track) {
  const value = track.title_display ?? track.title;
  if (value === null || value === undefined || value === '') {
    return `track:${track.track_id}`;
  }
  return String(value);
}

function toLaneItem(track, id) {
  return {
    id,
    trackId: track.track_id,
    title: toTitle(track),
    bpm: typeof track.bpm === 'number' ? track.bpm : null,
    keyNote: typeof track.key_note === 'number' ? track.key_note : null,
    duration: typeof track.duration_seconds === 'number' ? track.duration_seconds : null,
    colorHex: track.color_hex_generated || track.color_hex || '#5B758F'
  };
}

function buildInitialLanes(collection, selectedPlaylistIds) {
  const tracksById = new Map(collection.tracks.map((track) => [track.track_id, track]));
  const playlistsById = new Map(collection.playlists.map((playlist) => [playlist.playlist_id, playlist]));

  const relationsByPlaylist = new Map();
  for (const relation of collection.trackPlaylists) {
    const bucket = relationsByPlaylist.get(relation.playlist_id) ?? [];
    bucket.push(relation);
    relationsByPlaylist.set(relation.playlist_id, bucket);
  }

  for (const relations of relationsByPlaylist.values()) {
    relations.sort((a, b) => {
      const aPos = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
      const bPos = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
      if (aPos !== bPos) return aPos - bPos;
      return a.track_id - b.track_id;
    });
  }

  const selectedIds = [...selectedPlaylistIds].filter((id) => playlistsById.has(id));

  if (selectedIds.length === 0) {
    const scoped = getTracksForScope(collection, selectedPlaylistIds).slice().sort((a, b) => {
      const aBpm = typeof a.bpm === 'number' ? a.bpm : Number.MAX_SAFE_INTEGER;
      const bBpm = typeof b.bpm === 'number' ? b.bpm : Number.MAX_SAFE_INTEGER;
      if (aBpm !== bBpm) return aBpm - bBpm;
      return a.track_id - b.track_id;
    });

    return [
      {
        id: 'scope',
        title: 'Scoped Collection',
        items: scoped.map((track, index) => toLaneItem(track, `scope:${track.track_id}:${index}`))
      }
    ];
  }

  const lanes = selectedIds
    .map((playlistId) => {
      const playlist = playlistsById.get(playlistId);
      const relations = relationsByPlaylist.get(playlistId) ?? [];

      const items = relations
        .map((relation, index) => {
          const track = tracksById.get(relation.track_id);
          if (!track) return null;
          return toLaneItem(track, `playlist:${playlistId}:${relation.track_id}:${index}`);
        })
        .filter(Boolean);

      return {
        id: `playlist:${playlistId}`,
        title: String(playlist?.display_name ?? playlist?.name ?? `playlist:${playlistId}`),
        items
      };
    })
    .filter((lane) => lane.items.length > 0);

  if (lanes.length === 0) {
    return [
      {
        id: 'scope-empty',
        title: 'Scoped Collection',
        items: []
      }
    ];
  }

  return lanes;
}

function computeLaneGeometry(items, widthForDuration) {
  let x = 0;
  const blocks = [];

  for (const item of items) {
    const width = widthForDuration(item.duration);
    blocks.push({
      id: item.id,
      width,
      start: x,
      center: x + width / 2,
      bpm: item.bpm
    });
    x += width + ITEM_GAP;
  }

  const totalWidth = blocks.length ? x - ITEM_GAP : 180;
  return { blocks, totalWidth };
}

function buildBpmPath(blocks, yForBpm) {
  let path = '';
  for (const block of blocks) {
    if (typeof block.bpm !== 'number') continue;
    const x = block.center;
    const y = yForBpm(block.bpm);
    path += path ? ` L ${x} ${y}` : `M ${x} ${y}`;
  }
  return path;
}

function TrackCard({ item, width, showKey, isDragging, dragHandleProps }) {
  const camelot = keyNoteToCamelot(item.keyNote);
  const keyLabel = camelot ? `${camelot.number}${camelot.letter}` : '--';

  return (
    <div
      className={[styles.trackCard, isDragging ? styles.cardDragging : ''].join(' ').trim()}
      style={{ width, borderTopColor: item.colorHex }}
      {...dragHandleProps}
    >
      <div className={styles.trackTitle} title={item.title}>{item.title}</div>
      <div className={styles.trackMetaRow}>
        <span className={styles.metaPill}>{item.bpm ? `${item.bpm} BPM` : 'BPM ?'}</span>
        <span className={styles.metaPill}>{formatDuration(item.duration)}</span>
        {showKey ? <span className={styles.metaPill}>{keyLabel}</span> : null}
      </div>
    </div>
  );
}

function SortableTrackCard({ item, width, showKey }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 12 : 2
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TrackCard
        item={item}
        width={width}
        showKey={showKey}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function Lane({ lane, settings, widthForDuration, yForBpm }) {
  const geometry = useMemo(() => computeLaneGeometry(lane.items, widthForDuration), [lane.items, widthForDuration]);

  const bpmPath = useMemo(
    () => (settings.showBpmLine ? buildBpmPath(geometry.blocks, yForBpm) : ''),
    [geometry.blocks, settings.showBpmLine, yForBpm]
  );

  const bpmPoints = useMemo(
    () =>
      settings.showBpmLine
        ? geometry.blocks
            .filter((block) => typeof block.bpm === 'number')
            .map((block) => ({ x: block.center, y: yForBpm(block.bpm), bpm: block.bpm }))
        : [],
    [geometry.blocks, settings.showBpmLine, yForBpm]
  );

  const gapMarkers = useMemo(() => {
    const markers = [];
    for (let index = 0; index < lane.items.length - 1; index += 1) {
      const current = lane.items[index];
      const next = lane.items[index + 1];
      if (typeof current.bpm !== 'number' || typeof next.bpm !== 'number') continue;

      const diff = Math.abs(current.bpm - next.bpm);
      if (diff <= settings.gapThreshold) continue;

      const block = geometry.blocks[index];
      if (!block) continue;

      markers.push({
        left: block.start + block.width + ITEM_GAP / 2,
        diff,
        isHigh: diff >= settings.gapThreshold * 1.8
      });
    }

    return markers;
  }, [geometry.blocks, lane.items, settings.gapThreshold]);

  return (
    <article className={styles.lane}>
      <div className={styles.laneHeader}>
        <div className={styles.laneTitle}>{lane.title}</div>
        <div className={styles.laneMeta}>{lane.items.length} tracks</div>
      </div>

      <div className={styles.laneScroll}>
        <div className={styles.laneCanvas} style={{ width: geometry.totalWidth }}>
          {settings.showBpmLine ? (
            <svg className={styles.bpmOverlay} width={geometry.totalWidth} height={OVERLAY_HEIGHT}>
              <line x1="0" y1={OVERLAY_HEIGHT - 8} x2={geometry.totalWidth} y2={OVERLAY_HEIGHT - 8} stroke="rgba(91, 117, 143, 0.35)" />
              <path d={bpmPath} fill="none" stroke="#AB3DFF" strokeWidth="2.2" strokeLinecap="round" />
              {bpmPoints.map((point, index) => (
                <circle key={`${point.x}:${index}`} cx={point.x} cy={point.y} r="2.7" fill="#AB3DFF" />
              ))}
            </svg>
          ) : null}

          {gapMarkers.map((marker, index) => (
            <div
              key={`${marker.left}:${index}`}
              className={[styles.gapMarker, marker.isHigh ? styles.gapHigh : styles.gapMid].join(' ').trim()}
              style={{ left: marker.left }}
              title={`BPM delta ${Math.round(marker.diff)}`}
            >
              {Math.round(marker.diff)}
            </div>
          ))}

          <SortableContext items={lane.items.map((item) => item.id)} strategy={horizontalListSortingStrategy}>
            <div className={styles.cardsRow} style={{ marginTop: settings.showBpmLine ? OVERLAY_HEIGHT + 6 : 4 }}>
              {lane.items.map((item) => (
                <SortableTrackCard
                  key={item.id}
                  item={item}
                  width={widthForDuration(item.duration)}
                  showKey={settings.showKey}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </div>
    </article>
  );
}

export default function SetPlanner() {
  const collection = useExploreStore((state) => state.collection);
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const settings = useExploreStore((state) => state.setPlanner);

  const initialLanes = useMemo(
    () => buildInitialLanes(collection, selectedPlaylistIds),
    [collection, selectedPlaylistIds]
  );

  const [lanes, setLanes] = useState(initialLanes);

  useEffect(() => {
    setLanes(initialLanes);
  }, [initialLanes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const allDurations = useMemo(
    () =>
      lanes
        .flatMap((lane) => lane.items)
        .map((item) => item.duration)
        .filter((value) => typeof value === 'number'),
    [lanes]
  );

  const durationMin = allDurations.length ? Math.min(...allDurations) : 120;
  const durationMax = allDurations.length ? Math.max(...allDurations) : 420;

  const widthForDuration = useMemo(
    () =>
      (duration) => {
        const basis = typeof duration === 'number' ? duration : (durationMin + durationMax) / 2;
        if (durationMax === durationMin) return 140;
        const ratio = (basis - durationMin) / (durationMax - durationMin);
        return Math.round(clamp(72 + ratio * 150, 72, 222));
      },
    [durationMax, durationMin]
  );

  const allBpm = useMemo(
    () =>
      lanes
        .flatMap((lane) => lane.items)
        .map((item) => item.bpm)
        .filter((value) => typeof value === 'number'),
    [lanes]
  );

  const bpmMin = allBpm.length ? Math.min(...allBpm) : 90;
  const bpmMax = allBpm.length ? Math.max(...allBpm) : 140;

  const yForBpm = useMemo(
    () =>
      (bpm) => {
        if (bpmMax === bpmMin) return OVERLAY_HEIGHT / 2;
        const ratio = (bpm - bpmMin) / (bpmMax - bpmMin);
        return clamp(OVERLAY_HEIGHT - 8 - ratio * (OVERLAY_HEIGHT - 16), 8, OVERLAY_HEIGHT - 8);
      },
    [bpmMax, bpmMin]
  );

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLanes((current) => {
      const next = current.map((lane) => ({ ...lane, items: [...lane.items] }));
      const laneIndex = next.findIndex((lane) => lane.items.some((item) => item.id === active.id));
      if (laneIndex < 0) return current;

      const lane = next[laneIndex];
      if (!lane.items.some((item) => item.id === over.id)) {
        return current;
      }

      const oldIndex = lane.items.findIndex((item) => item.id === active.id);
      const newIndex = lane.items.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;

      lane.items = arrayMove(lane.items, oldIndex, newIndex);
      return next;
    });
  }

  function mergeLanes() {
    if (lanes.length < 2) return;

    const mergedItems = lanes.flatMap((lane) => lane.items);
    setLanes([
      {
        id: `merged:${Date.now()}`,
        title: 'Merged Set',
        items: mergedItems.map((item, index) => ({ ...item, id: `merged:${item.trackId}:${index}` }))
      }
    ]);
  }

  const totalTracks = lanes.reduce((sum, lane) => sum + lane.items.length, 0);

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Set Planner</div>
          <div className={styles.subtitle}>
            {lanes.length} lanes · {totalTracks} tracks · Drag cards to reorder live.
          </div>
        </div>
        {lanes.length > 1 ? (
          <button type="button" className={styles.mergeButton} onClick={mergeLanes}>
            Merge Lanes
          </button>
        ) : null}
      </div>

      <div className={styles.instructions}>
        Gap markers appear when adjacent BPM delta exceeds {settings.gapThreshold}. Larger red badges indicate severe jumps.
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className={styles.lanesWrap}>
          {lanes.map((lane) => (
            <Lane
              key={lane.id}
              lane={lane}
              settings={settings}
              widthForDuration={widthForDuration}
              yForBpm={yForBpm}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}
