import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getTracksForScope, keyNoteToCamelot } from '../../data/dataUtils';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './IdeationCanvas.module.css';

const CARD_HEIGHT = 92;
const NOTE_HEIGHT = 86;
const WORLD_HALF = 3400;
const WORLD_SIZE = WORLD_HALF * 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hash32(input) {
  const value = String(input);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.floor(seconds % 60));
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function toLabel(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
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

function camelotDistance(a, b) {
  const ca = keyNoteToCamelot(a);
  const cb = keyNoteToCamelot(b);
  if (!ca || !cb) return Infinity;
  if (ca.letter !== cb.letter) return Infinity;

  const direct = Math.abs(ca.number - cb.number);
  const wrapped = 12 - direct;
  return Math.min(direct, wrapped);
}

function buildTrackSearchIndex(collection, scopedTracks) {
  const artistsById = new Map(collection.artists.map((artist) => [artist.artist_id, toLabel(artist.display_name ?? artist.name, `artist:${artist.artist_id}`)]));
  const tagsById = new Map(collection.tags.map((tag) => [tag.tag_id, toLabel(tag.display_name ?? tag.name, `tag:${tag.tag_id}`)]));

  const artistIdsByTrack = new Map();
  for (const relation of collection.trackArtists) {
    const bucket = artistIdsByTrack.get(relation.track_id) ?? [];
    bucket.push(relation.artist_id);
    artistIdsByTrack.set(relation.track_id, bucket);
  }

  const tagIdsByTrack = new Map();
  for (const relation of collection.trackTags) {
    const bucket = tagIdsByTrack.get(relation.track_id) ?? [];
    bucket.push(relation.tag_id);
    tagIdsByTrack.set(relation.track_id, bucket);
  }

  return scopedTracks.map((track) => {
    const title = toLabel(track.title_display ?? track.title, `track:${track.track_id}`);
    const artistNames = [...new Set((artistIdsByTrack.get(track.track_id) ?? []).map((artistId) => artistsById.get(artistId) ?? `artist:${artistId}`))];
    const tagNames = [...new Set((tagIdsByTrack.get(track.track_id) ?? []).map((tagId) => tagsById.get(tagId) ?? `tag:${tagId}`))].slice(0, 2);
    const search = `${title} ${artistNames.join(' ')} ${tagNames.join(' ')}`.toLowerCase();

    return {
      track,
      title,
      artistText: artistNames.join(', ') || 'Unknown Artist',
      tagNames,
      search
    };
  });
}

function createCardFromTrack(entry, width, x, y) {
  return {
    id: `card:${entry.track.track_id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    type: 'track',
    x,
    y,
    width,
    height: CARD_HEIGHT,
    trackId: entry.track.track_id,
    title: entry.title,
    artistText: entry.artistText,
    tagNames: entry.tagNames,
    bpm: typeof entry.track.bpm === 'number' ? entry.track.bpm : null,
    keyNote: typeof entry.track.key_note === 'number' ? entry.track.key_note : null,
    duration: typeof entry.track.duration_seconds === 'number' ? entry.track.duration_seconds : null,
    colorHex: entry.track.color_hex_generated || entry.track.color_hex || '#5B758F'
  };
}

function createNoteCard(text, x, y) {
  return {
    id: `note:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    type: 'note',
    x,
    y,
    width: 190,
    height: NOTE_HEIGHT,
    note: text
  };
}

function cardCenter(card) {
  return {
    x: card.x + card.width / 2,
    y: card.y + card.height / 2
  };
}

function edgeExists(edges, from, to) {
  return edges.some((edge) => edge.from === from && edge.to === to);
}

function buildHeuristicPath(cards, edges) {
  const trackCards = cards.filter((card) => card.type === 'track');
  if (!trackCards.length) return [];

  const incoming = new Map();
  const outgoing = new Map();
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    const bucket = outgoing.get(edge.from) ?? [];
    bucket.push(edge.to);
    outgoing.set(edge.from, bucket);
  }

  const roots = trackCards
    .filter((card) => (incoming.get(card.id) ?? 0) === 0)
    .sort((a, b) => a.x - b.x || a.y - b.y);

  const start = roots[0] ?? trackCards.sort((a, b) => a.x - b.x || a.y - b.y)[0];
  const path = [start.id];
  const visited = new Set(path);

  let current = start.id;
  while (true) {
    const nextCandidates = (outgoing.get(current) ?? [])
      .map((id) => cards.find((card) => card.id === id))
      .filter((card) => card && card.type === 'track' && !visited.has(card.id))
      .sort((a, b) => a.x - b.x || a.y - b.y);

    if (!nextCandidates.length) break;
    const next = nextCandidates[0];
    visited.add(next.id);
    path.push(next.id);
    current = next.id;
  }

  return path;
}

function isTraceEdge(edge, tracePath) {
  for (let i = 0; i < tracePath.length - 1; i += 1) {
    if (tracePath[i] === edge.from && tracePath[i + 1] === edge.to) return true;
  }
  return false;
}

export default function IdeationCanvas() {
  const collection = useExploreStore((state) => state.collection);
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const ideationCanvas = useExploreStore((state) => state.ideationCanvas);

  const scopedTracks = useMemo(
    () => getTracksForScope(collection, selectedPlaylistIds),
    [collection, selectedPlaylistIds]
  );

  const trackIndex = useMemo(
    () => buildTrackSearchIndex(collection, scopedTracks),
    [collection, scopedTracks]
  );

  const allDurations = trackIndex
    .map((entry) => entry.track.duration_seconds)
    .filter((value) => typeof value === 'number');
  const durationMin = allDurations.length ? Math.min(...allDurations) : 120;
  const durationMax = allDurations.length ? Math.max(...allDurations) : 420;

  const widthForDuration = useMemo(
    () =>
      (duration) => {
        const basis = typeof duration === 'number' ? duration : (durationMin + durationMax) / 2;
        if (durationMax === durationMin) return 160;
        const ratio = (basis - durationMin) / (durationMax - durationMin);
        return Math.round(clamp(96 + ratio * 128, 96, 224));
      },
    [durationMax, durationMin]
  );

  const [cards, setCards] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [connectFromId, setConnectFromId] = useState(null);
  const [traceMode, setTraceMode] = useState(false);
  const [tracePath, setTracePath] = useState([]);
  const [hint, setHint] = useState('Click + to add your first track card.');

  const [modal, setModal] = useState({
    open: false,
    parentCardId: null,
    query: '',
    mode: 'search'
  });

  const wrapRef = useRef(null);
  const size = useElementSize(wrapRef);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const interactionRef = useRef(null);
  const canvasUnavailable = size.width <= 0 || size.height <= 0;

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    setView((current) => {
      if (current.x !== 0 || current.y !== 0 || current.scale !== 1) return current;
      return { x: 0, y: 0, scale: 1 };
    });
  }, [size.height, size.width]);

  useEffect(() => {
    setCards([]);
    setEdges([]);
    setSelectedCardId(null);
    setConnectFromId(null);
    setTraceMode(false);
    setTracePath([]);
    setHint('Canvas cleared. Add a track card to begin.');
  }, [ideationCanvas.clearSignal]);

  useEffect(() => {
    setTraceMode(true);
    setTracePath([]);
    setConnectFromId(null);
    setHint('Trace mode active: click connected track cards in order, then finish.');
  }, [ideationCanvas.createPlaylistSignal]);

  useEffect(() => {
    function onMove(event) {
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (interaction.type === 'pan') {
        const dx = event.clientX - interaction.startClientX;
        const dy = event.clientY - interaction.startClientY;
        setView((current) => ({ ...current, x: interaction.startX + dx, y: interaction.startY + dy }));
      }

      if (interaction.type === 'card') {
        const dx = (event.clientX - interaction.startClientX) / view.scale;
        const dy = (event.clientY - interaction.startClientY) / view.scale;

        setCards((current) =>
          current.map((card) =>
            card.id === interaction.cardId
              ? {
                  ...card,
                  x: clamp(interaction.startCardX + dx, -WORLD_HALF + 20, WORLD_HALF - card.width - 20),
                  y: clamp(interaction.startCardY + dy, -WORLD_HALF + 20, WORLD_HALF - card.height - 20)
                }
              : card
          )
        );
      }
    }

    function onUp() {
      interactionRef.current = null;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [view.scale]);

  const trackByCardId = useMemo(
    () => new Map(cards.filter((card) => card.type === 'track').map((card) => [card.id, card])),
    [cards]
  );

  function screenToWorld(clientX, clientY) {
    if (!wrapRef.current) return { x: 0, y: 0 };
    const rect = wrapRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    return {
      x: (px - rect.width / 2 - view.x) / view.scale,
      y: (py - rect.height / 2 - view.y) / view.scale
    };
  }

  function openTrackModal(parentCardId = null) {
    setModal({ open: true, parentCardId, query: '', mode: 'search' });
  }

  function closeModal() {
    setModal((current) => ({ ...current, open: false }));
  }

  function addTrackCard(entry) {
    const parent = modal.parentCardId ? cards.find((card) => card.id === modal.parentCardId) : null;

    let x = 0;
    let y = 0;

    if (parent) {
      const jitter = (hash32(`${parent.id}:${entry.track.track_id}`) % 91) - 45;
      x = parent.x + parent.width + 120;
      y = parent.y + jitter;
    } else {
      x = -90;
      y = -45;
    }

    const card = createCardFromTrack(entry, widthForDuration(entry.track.duration_seconds), x, y);

    setCards((current) => [...current, card]);
    if (parent) {
      setEdges((current) => [
        ...current,
        {
          id: `edge:${parent.id}:${card.id}:${Date.now()}`,
          from: parent.id,
          to: card.id
        }
      ]);
    }

    setSelectedCardId(card.id);
    setHint(parent ? 'Track added and connected.' : 'Track added. Use Connect mode to create branches.');
    closeModal();
  }

  function addNoteCardAt(clientX, clientY) {
    const point = screenToWorld(clientX, clientY);
    const text = window.prompt('Note text', 'Note');
    if (text === null) return;

    const note = createNoteCard(text.trim() || 'Note', point.x - 80, point.y - 30);
    setCards((current) => [...current, note]);
    setSelectedCardId(note.id);
    setHint('Note added.');
  }

  function onCardClick(cardId) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;

    if (traceMode) {
      if (card.type !== 'track') {
        setHint('Trace mode only accepts track cards.');
        return;
      }

      setTracePath((current) => {
        if (!current.length) {
          setHint('Trace started. Continue through connected cards.');
          return [cardId];
        }

        const last = current[current.length - 1];
        if (last === cardId) return current;

        const valid = edgeExists(edges, last, cardId);
        if (!valid) {
          setHint('Invalid step. Click a card connected from the previous one.');
          return current;
        }

        if (current.includes(cardId)) {
          setHint('Card already in trace path.');
          return current;
        }

        setHint('Trace step added.');
        return [...current, cardId];
      });

      return;
    }

    setSelectedCardId(cardId);

    if (ideationCanvas.toolMode === 'connect') {
      setConnectFromId((current) => {
        if (!current || current === cardId) {
          setHint('Connect source selected. Click another card to create a link.');
          return cardId;
        }

        if (!edgeExists(edges, current, cardId)) {
          setEdges((prev) => [
            ...prev,
            {
              id: `edge:${current}:${cardId}:${Date.now()}`,
              from: current,
              to: cardId
            }
          ]);
          setHint('Connector created.');
        } else {
          setHint('Connector already exists.');
        }

        return cardId;
      });
    }
  }

  function onCardMouseDown(event, card) {
    event.preventDefault();
    event.stopPropagation();

    if (traceMode) return;
    if (ideationCanvas.toolMode !== 'move') return;

    interactionRef.current = {
      type: 'card',
      cardId: card.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCardX: card.x,
      startCardY: card.y
    };
  }

  function onCanvasMouseDown(event) {
    if (event.button !== 0) return;

    if (traceMode) return;

    if (ideationCanvas.toolMode === 'note') {
      addNoteCardAt(event.clientX, event.clientY);
      return;
    }

    if (ideationCanvas.toolMode === 'connect') {
      setConnectFromId(null);
      setSelectedCardId(null);
      setHint('Connect source cleared.');
      return;
    }

    interactionRef.current = {
      type: 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: view.x,
      startY: view.y
    };
  }

  function onWheel(event) {
    event.preventDefault();
    if (!wrapRef.current) return;

    const rect = wrapRef.current.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    const scaleBy = 1.08;
    const nextScale = clamp(event.deltaY > 0 ? view.scale / scaleBy : view.scale * scaleBy, 0.35, 2.5);

    const mousePointTo = {
      x: (px - rect.width / 2 - view.x) / view.scale,
      y: (py - rect.height / 2 - view.y) / view.scale
    };

    setView({
      scale: nextScale,
      x: px - rect.width / 2 - mousePointTo.x * nextScale,
      y: py - rect.height / 2 - mousePointTo.y * nextScale
    });
  }

  function finishTracePlaylist() {
    if (!tracePath.length) {
      const heuristic = buildHeuristicPath(cards, edges);
      if (!heuristic.length) {
        window.alert('No valid track path found.');
        return;
      }
      setTracePath(heuristic);
      setHint('Heuristic path filled. Click Finish again to export.');
      return;
    }

    const playlistName = window.prompt('Playlist name', 'Canvas Playlist');
    if (!playlistName) return;

    const tracksInPath = tracePath
      .map((cardId) => trackByCardId.get(cardId))
      .filter(Boolean);

    const preview = tracksInPath
      .slice(0, 10)
      .map((card) => card.title)
      .join(', ');
    const overflow = tracksInPath.length > 10 ? ` +${tracksInPath.length - 10} more` : '';

    window.alert(
      `Prototype action: create playlist \"${playlistName}\" with ${tracksInPath.length} tracks.\n${preview}${overflow}`
    );

    setTraceMode(false);
    setTracePath([]);
    setHint('Trace exported (prototype action).');
  }

  function cancelTrace() {
    setTraceMode(false);
    setTracePath([]);
    setHint('Trace mode cancelled.');
  }

  const modalSourceCard = modal.parentCardId ? trackByCardId.get(modal.parentCardId) : null;
  const sourceCamelot = modalSourceCard ? keyNoteToCamelot(modalSourceCard.keyNote) : null;

  const modalResults = useMemo(() => {
    const query = modal.query.trim().toLowerCase();
    let base = trackIndex;

    if (query) {
      base = base.filter((entry) => entry.search.includes(query));
    }

    if (modal.mode === 'suggest' && modalSourceCard) {
      const sourceBpm = modalSourceCard.bpm;
      const sourceKey = modalSourceCard.keyNote;

      const suggested = base.filter((entry) => {
        const bpmOk =
          typeof sourceBpm !== 'number' || typeof entry.track.bpm !== 'number'
            ? true
            : Math.abs(entry.track.bpm - sourceBpm) <= 8;

        const keyOk =
          typeof sourceKey !== 'number' || typeof entry.track.key_note !== 'number'
            ? true
            : camelotDistance(sourceKey, entry.track.key_note) <= 1;

        return bpmOk && keyOk;
      });

      return suggested.slice(0, 60);
    }

    return base.slice(0, 80);
  }, [modal.mode, modal.query, modalSourceCard, trackIndex]);

  const tracePathSet = new Set(tracePath);

  const visibleWorldBounds = useMemo(() => {
    if (size.width <= 0 || size.height <= 0) {
      return { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity };
    }
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    return {
      left: (-halfW - view.x) / view.scale,
      right: (halfW - view.x) / view.scale,
      top: (-halfH - view.y) / view.scale,
      bottom: (halfH - view.y) / view.scale
    };
  }, [size.height, size.width, view.scale, view.x, view.y]);

  const visibleCardCount = useMemo(
    () =>
      cards.filter((card) => {
        const cardLeft = card.x;
        const cardRight = card.x + card.width;
        const cardTop = card.y;
        const cardBottom = card.y + card.height;
        return !(
          cardRight < visibleWorldBounds.left ||
          cardLeft > visibleWorldBounds.right ||
          cardBottom < visibleWorldBounds.top ||
          cardTop > visibleWorldBounds.bottom
        );
      }).length,
    [cards, visibleWorldBounds]
  );

  function resetViewToCenter() {
    setView({ x: 0, y: 0, scale: 1 });
  }

  function recenterToCards() {
    if (!cards.length) {
      resetViewToCenter();
      return;
    }

    const minX = Math.min(...cards.map((card) => card.x));
    const maxX = Math.max(...cards.map((card) => card.x + card.width));
    const minY = Math.min(...cards.map((card) => card.y));
    const maxY = Math.max(...cards.map((card) => card.y + card.height));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setView((current) => ({ ...current, x: -cx * current.scale, y: -cy * current.scale }));
  }

  return (
    <section className={styles.root}>
      <div className={styles.topBar}>
        <div className={styles.topTitle}>Ideation Canvas</div>
        <div className={styles.topMeta}>
          {cards.length} cards · {edges.length} connectors · {ideationCanvas.toolMode} tool
        </div>
        <div className={styles.topHint}>{hint}</div>
      </div>

      <div ref={wrapRef} className={styles.canvasWrap} onMouseDown={onCanvasMouseDown} onWheel={onWheel}>
        <div
          className={styles.world}
          style={{
            width: WORLD_SIZE,
            height: WORLD_SIZE,
            transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) scale(${view.scale})`
          }}
        >
          <svg className={styles.edgeSvg} width={WORLD_SIZE} height={WORLD_SIZE}>
            {edges.map((edge) => {
              const from = cards.find((card) => card.id === edge.from);
              const to = cards.find((card) => card.id === edge.to);
              if (!from || !to) return null;

              const fromCenter = cardCenter(from);
              const toCenter = cardCenter(to);
              const traceEdge = isTraceEdge(edge, tracePath);

              return (
                <line
                  key={edge.id}
                  x1={fromCenter.x + WORLD_HALF}
                  y1={fromCenter.y + WORLD_HALF}
                  x2={toCenter.x + WORLD_HALF}
                  y2={toCenter.y + WORLD_HALF}
                  stroke={traceEdge ? '#AB3DFF' : '#435D77'}
                  strokeWidth={traceEdge ? 2.4 : 1.7}
                  opacity={0.95}
                />
              );
            })}
          </svg>

          {cards.map((card) => {
            const left = card.x + WORLD_HALF;
            const top = card.y + WORLD_HALF;

            if (card.type === 'note') {
              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  className={[styles.noteCard, selectedCardId === card.id ? styles.noteSelected : ''].join(' ').trim()}
                  style={{ left, top, width: card.width, height: card.height }}
                  onMouseDown={(event) => onCardMouseDown(event, card)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCardClick(card.id);
                  }}
                >
                  <div className={styles.noteText}>{card.note}</div>
                </div>
              );
            }

            const camelot = keyNoteToCamelot(card.keyNote);
            const keyLabel = camelot ? `${camelot.number}${camelot.letter}` : '--';

            return (
              <div
                key={card.id}
                data-card-id={card.id}
                className={[
                  styles.trackCard,
                  selectedCardId === card.id ? styles.cardSelected : '',
                  connectFromId === card.id ? styles.cardConnectFrom : '',
                  tracePathSet.has(card.id) ? styles.cardTrace : ''
                ]
                  .join(' ')
                  .trim()}
                style={{ left, top, width: card.width, height: card.height, borderTopColor: card.colorHex }}
                onMouseDown={(event) => onCardMouseDown(event, card)}
                onClick={(event) => {
                  event.stopPropagation();
                  onCardClick(card.id);
                }}
              >
                <div className={styles.trackTitle}>{card.title}</div>
                <div className={styles.trackArtist}>{card.artistText}</div>
                <div className={styles.trackMeta}>{card.bpm ? `${card.bpm} BPM` : 'BPM ?'} · {formatDuration(card.duration)} · {keyLabel}</div>
                <div className={styles.trackTags}>{card.tagNames.length ? card.tagNames.map((name) => `#${name}`).join(' ') : '#untagged'}</div>

                <button
                  type="button"
                  className={styles.plusHandle}
                  onClick={(event) => {
                    event.stopPropagation();
                    openTrackModal(card.id);
                  }}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>

        {!cards.length ? (
          <div className={styles.emptyOverlay}>
            <div className={styles.emptyTitle}>Start Building a Set</div>
            <div className={styles.emptyBody}>
              Add your first track card, then branch with the `+` handles. Use Connect mode to draw alternative paths.
            </div>
            <div className={styles.emptyActions}>
              <button type="button" className={styles.addFirst} onClick={() => openTrackModal(null)}>
                + Add First Track
              </button>
              <button
                type="button"
                className={styles.addFirst}
                onClick={() => {
                  const rect = wrapRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  addNoteCardAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
                }}
              >
                + Add Note
              </button>
            </div>
          </div>
        ) : null}

        {canvasUnavailable ? (
          <div className={styles.canvasBooting}>
            Initializing canvas... ({size.width} x {size.height})
          </div>
        ) : null}

        {traceMode ? (
          <div className={styles.tracePanel}>
            <div className={styles.traceTitle}>Trace Playlist Path</div>
            <div className={styles.traceMeta}>{tracePath.length} cards selected</div>
            <div className={styles.traceActions}>
              <button type="button" onClick={finishTracePlaylist}>Finish Trace</button>
              <button type="button" onClick={cancelTrace}>Cancel</button>
            </div>
          </div>
        ) : null}

        {cards.length > 0 && visibleCardCount === 0 ? (
          <div className={styles.recenterOverlay}>
            <div className={styles.recenterTitle}>Cards are outside the viewport</div>
            <div className={styles.recenterActions}>
              <button type="button" onClick={recenterToCards}>Recenter to Cards</button>
              <button type="button" onClick={resetViewToCenter}>Reset View</button>
            </div>
          </div>
        ) : null}
      </div>

      {canvasUnavailable ? (
        <div className={styles.hardFallback}>
          Canvas container has no visible area yet. If this persists after refresh, layout is constrained upstream.
        </div>
      ) : null}

      {modal.open ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>{modal.parentCardId ? 'Add Next Track' : 'Add Track Card'}</div>
                <div className={styles.modalSub}>
                  {modalSourceCard
                    ? `Source: ${modalSourceCard.title}${sourceCamelot ? ` · ${sourceCamelot.number}${sourceCamelot.letter}` : ''}${modalSourceCard.bpm ? ` · ${modalSourceCard.bpm} BPM` : ''}`
                    : 'Search by title, artist, or tag'}
                </div>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeModal}>Close</button>
            </div>

            <div className={styles.modalControls}>
              <input
                type="text"
                value={modal.query}
                placeholder="Search tracks..."
                onChange={(event) => setModal((current) => ({ ...current, query: event.target.value }))}
              />

              {modalSourceCard ? (
                <div className={styles.modeRow}>
                  <button
                    type="button"
                    className={[styles.modeButton, modal.mode === 'search' ? styles.modeActive : ''].join(' ').trim()}
                    onClick={() => setModal((current) => ({ ...current, mode: 'search' }))}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    className={[styles.modeButton, modal.mode === 'suggest' ? styles.modeActive : ''].join(' ').trim()}
                    onClick={() => setModal((current) => ({ ...current, mode: 'suggest' }))}
                  >
                    Suggest
                  </button>
                </div>
              ) : null}
            </div>

            <div className={styles.results}>
              {modalResults.map((entry) => (
                <button
                  key={entry.track.track_id}
                  type="button"
                  className={styles.resultRow}
                  onClick={() => addTrackCard(entry)}
                >
                  <div className={styles.resultTitle}>{entry.title}</div>
                  <div className={styles.resultMeta}>
                    {entry.artistText} · {entry.track.bpm ? `${entry.track.bpm} BPM` : 'BPM ?'} · {formatDuration(entry.track.duration_seconds)}
                  </div>
                </button>
              ))}
              {!modalResults.length ? <div className={styles.emptyResults}>No tracks match this filter.</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
