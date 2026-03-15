import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getTracksForScope } from '../../data/dataUtils';
import { useExploreStore } from '../../store/useExploreStore';
import { labelForMetric } from './myWorldConfig';
import { buildMyWorldModel, formatDuration, pointString } from './myWorldUtils';
import MyWorldTerrain3D from './MyWorldTerrain3D';
import styles from './MyWorld.module.css';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
      setSize((current) => {
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function winnerFromCounts(map) {
  let winner = 'Unknown';
  let winnerCount = -1;

  for (const [value, count] of map.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }

  return winner;
}

function shadeHslColor(color, lightnessDelta = 0, saturationDelta = 0) {
  const match = String(color).match(/^hsl\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/i);
  if (!match) return color;

  const hue = Number(match[1]);
  const saturation = clamp(Number(match[2]) + saturationDelta, 0, 100);
  const lightness = clamp(Number(match[3]) + lightnessDelta, 0, 100);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function hasWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function buildTerrainGeometry(model, viewport, heightScale) {
  const { width, height } = viewport;
  if (!width || !height || !model.cells?.length) {
    return {
      worldWidth: 1,
      worldHeight: 1,
      maxHeight: 0,
      topTiles: [],
      sideFaces: []
    };
  }

  const gridSize = model.gridSize;
  const tileW = clamp((width - 90) / Math.max(1, gridSize), 5, 14);
  const tileH = tileW * 0.56;
  const heightBoost = clamp(heightScale / 100, 0.6, 2.8);
  const heights = model.cells.map((cell) => cell.heightPx * heightBoost);

  const maxHeight = heights.reduce((max, value) => Math.max(max, value), 0);
  const worldWidth = gridSize * tileW + tileW;
  const worldHeight = gridSize * tileH + maxHeight + 92;
  const originX = worldWidth / 2;
  const originY = 34 + maxHeight;

  function cellIndex(x, y) {
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return -1;
    return y * gridSize + x;
  }

  function pointsForCell(x, y, extrusion) {
    const baseX = originX + (x - y) * (tileW / 2);
    const baseY = originY + (x + y) * (tileH / 2);
    const topCenterY = baseY - extrusion;

    return {
      baseY,
      n: [baseX, topCenterY - tileH / 2],
      e: [baseX + tileW / 2, topCenterY],
      s: [baseX, topCenterY + tileH / 2],
      w: [baseX - tileW / 2, topCenterY],
      label: [baseX, topCenterY + 2]
    };
  }

  const pointCache = model.cells.map((cell) => pointsForCell(cell.x, cell.y, heights[cell.index]));
  const topTiles = [];

  for (const cell of model.cells) {
    if (cell.count === 0 && cell.heightRatio < 0.01) continue;

    const points = pointCache[cell.index];
    const north = heights[cellIndex(cell.x, cell.y - 1)] ?? heights[cell.index];
    const east = heights[cellIndex(cell.x + 1, cell.y)] ?? heights[cell.index];
    const south = heights[cellIndex(cell.x, cell.y + 1)] ?? heights[cell.index];
    const west = heights[cellIndex(cell.x - 1, cell.y)] ?? heights[cell.index];

    const slope = Math.max(
      Math.abs(heights[cell.index] - north),
      Math.abs(heights[cell.index] - east),
      Math.abs(heights[cell.index] - south),
      Math.abs(heights[cell.index] - west)
    );

    topTiles.push({
      id: cell.index,
      cell,
      depth: points.baseY,
      points,
      slopeRatio: maxHeight > 0 ? clamp(slope / (maxHeight * 0.34), 0, 1) : 0
    });
  }

  topTiles.sort((a, b) => a.depth - b.depth || a.cell.y - b.cell.y || a.cell.x - b.cell.x);

  const sideFaces = [];
  const cliffThreshold = 0.8;

  for (const tile of topTiles) {
    const currentHeight = heights[tile.id];
    const rightIndex = cellIndex(tile.cell.x + 1, tile.cell.y);
    const downIndex = cellIndex(tile.cell.x, tile.cell.y + 1);

    if (rightIndex !== -1) {
      const neighborHeight = heights[rightIndex];
      if (currentHeight - neighborHeight > cliffThreshold) {
        const neighbor = pointCache[rightIndex];
        const dropRatio = maxHeight > 0 ? clamp((currentHeight - neighborHeight) / maxHeight, 0.05, 1) : 0.08;
        sideFaces.push({
          id: `r-${tile.id}`,
          ownerId: tile.id,
          ownerX: tile.cell.x,
          ownerY: tile.cell.y,
          kind: 'right',
          depth: tile.depth + 0.1,
          color: shadeHslColor(tile.cell.color, -12 - dropRatio * 12, -8),
          points: [tile.points.e, tile.points.s, neighbor.w, neighbor.n]
        });
      }
    }

    if (downIndex !== -1) {
      const neighborHeight = heights[downIndex];
      if (currentHeight - neighborHeight > cliffThreshold) {
        const neighbor = pointCache[downIndex];
        const dropRatio = maxHeight > 0 ? clamp((currentHeight - neighborHeight) / maxHeight, 0.05, 1) : 0.08;
        sideFaces.push({
          id: `d-${tile.id}`,
          ownerId: tile.id,
          ownerX: tile.cell.x,
          ownerY: tile.cell.y,
          kind: 'down',
          depth: tile.depth + 0.2,
          color: shadeHslColor(tile.cell.color, -18 - dropRatio * 14, -10),
          points: [tile.points.w, tile.points.s, neighbor.e, neighbor.n]
        });
      }
    }
  }

  sideFaces.sort((a, b) => a.depth - b.depth);

  return {
    worldWidth,
    worldHeight,
    maxHeight,
    topTiles,
    sideFaces
  };
}

export default function MyWorld({ collection }) {
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const myWorld = useExploreStore((state) => state.myWorld);

  const tracks = useMemo(
    () => getTracksForScope(collection, selectedPlaylistIds),
    [collection, selectedPlaylistIds]
  );

  const model = useMemo(() => buildMyWorldModel(collection, tracks, myWorld), [collection, tracks, myWorld]);

  const [selectedCellId, setSelectedCellId] = useState(null);
  const [camera, setCamera] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [supportsWebgl, setSupportsWebgl] = useState(true);
  const [reset3DSignal, setReset3DSignal] = useState(0);

  useEffect(() => {
    setSupportsWebgl(hasWebGLSupport());
  }, []);

  const use3DMode = myWorld.renderMode === 'terrain3d' && supportsWebgl;

  const canvasRef = useRef(null);
  const canvasSize = useElementSize(canvasRef);

  const geometry = useMemo(
    () => (use3DMode ? { worldWidth: 1, worldHeight: 1, maxHeight: 0, topTiles: [], sideFaces: [] } : buildTerrainGeometry(model, canvasSize, myWorld.heightScale)),
    [model, canvasSize, myWorld.heightScale, use3DMode]
  );
  const sideFacesByOwner = useMemo(() => {
    const map = new Map();
    for (const face of geometry.sideFaces) {
      const bucket = map.get(face.ownerId) ?? [];
      bucket.push(face);
      map.set(face.ownerId, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.depth - b.depth);
    }
    return map;
  }, [geometry.sideFaces]);
  const drawItems = useMemo(() => {
    const items = [];

    for (const tile of geometry.topTiles) {
      const ownerFaces = sideFacesByOwner.get(tile.id) ?? [];

      for (const face of ownerFaces) {
        items.push({
          id: face.id,
          kind: 'side',
          depth: tile.depth + (face.kind === 'right' ? 0.05 : 0.08),
          sortX: face.ownerX,
          sortY: face.ownerY,
          face
        });
      }

      items.push({
        id: `top-${tile.id}`,
        kind: 'top',
        depth: tile.depth + 0.14,
        sortX: tile.cell.x,
        sortY: tile.cell.y,
        tile
      });
    }

    items.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (a.sortY !== b.sortY) return a.sortY - b.sortY;
      if (a.sortX !== b.sortX) return a.sortX - b.sortX;
      if (a.kind === b.kind) return 0;
      return a.kind === 'side' ? -1 : 1;
    });

    return items;
  }, [geometry.topTiles, sideFacesByOwner]);

  useEffect(() => {
    const selectable = model.cells?.filter((cell) => cell.count > 0) ?? [];
    if (!selectable.length) {
      setSelectedCellId(null);
      return;
    }

    setSelectedCellId((current) => {
      if (current !== null && selectable.some((cell) => cell.index === current)) return current;
      return selectable[0].index;
    });
  }, [model.cells]);

  const selectedCell = useMemo(
    () => model.cells?.find((cell) => cell.index === selectedCellId) ?? null,
    [model.cells, selectedCellId]
  );

  const fitScale = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height) return 1;
    const xScale = (canvasSize.width - 20) / geometry.worldWidth;
    const yScale = (canvasSize.height - 20) / geometry.worldHeight;
    return clamp(Math.min(xScale, yScale), 0.2, 2.2);
  }, [canvasSize.width, canvasSize.height, geometry.worldWidth, geometry.worldHeight]);

  const renderScale = fitScale * camera.zoom;
  const transform = `translate(${canvasSize.width / 2 + camera.panX} ${canvasSize.height / 2 + camera.panY}) scale(${renderScale}) translate(${-geometry.worldWidth / 2} ${-geometry.worldHeight / 2})`;

  const dragRef = useRef(null);

  function onPointerDown(event) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: camera.panX,
      panY: camera.panY
    };
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    setCamera((current) => ({
      ...current,
      panX: drag.panX + deltaX,
      panY: drag.panY + deltaY
    }));
  }

  function onPointerEnd(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
  }

  function onWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.11 : 0.9;
    setCamera((current) => ({
      ...current,
      zoom: clamp(current.zoom * factor, 0.65, 4.5)
    }));
  }

  const statusItems = [
    {
      label: 'Data',
      value: tracks.length > 0 ? `${tracks.length} tracks` : 'No tracks'
    },
    {
      label: 'Grid',
      value: `${model.populatedCells}/${model.totalCells} cells`
    },
    {
      label: 'Render',
      value: use3DMode ? '3D terrain' : `${geometry.topTiles.length} terrain cells`
    }
  ];

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>My World</div>
        <div className={styles.subtitle}>
          Collection terrain from axis mapping. Similar tracks form hills, sparse pockets become valleys.
        </div>
        <div className={styles.badges}>
          {statusItems.map((item) => (
            <span key={item.label} className={styles.badge}>
              <strong>{item.label}</strong> {item.value}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.mapWrap} ref={canvasRef}>
          {tracks.length === 0 ? (
            <div className={styles.emptyState}>No tracks in this scope. Select a playlist or switch to All Collection.</div>
          ) : use3DMode ? (
            <MyWorldTerrain3D
              model={model}
              heightScale={myWorld.heightScale}
              selectedCellId={selectedCellId}
              onSelectCell={setSelectedCellId}
              resetSignal={reset3DSignal}
            />
          ) : (
            <svg
              className={styles.mapSvg}
              viewBox={`0 0 ${Math.max(1, canvasSize.width)} ${Math.max(1, canvasSize.height)}`}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
            >
              <defs>
                <radialGradient id="myWorldBg" cx="50%" cy="34%" r="74%">
                  <stop offset="0%" stopColor="#2B465F" />
                  <stop offset="100%" stopColor="#020E19" />
                </radialGradient>
              </defs>
              <rect width={canvasSize.width} height={canvasSize.height} fill="url(#myWorldBg)" />
              <g transform={transform}>
                {drawItems.map((item) => {
                  if (item.kind === 'side') {
                    return (
                      <polygon
                        key={item.id}
                        points={pointString(item.face.points)}
                        className={styles.sideFace}
                        fill={item.face.color}
                      />
                    );
                  }

                  const tile = item.tile;
                  const isSelected = tile.id === selectedCellId;
                  const isTrackTile = tile.cell.count > 0;
                  const strokeAlpha = 0.16 + tile.slopeRatio * 0.33;

                  return (
                    <g
                      key={item.id}
                      className={isTrackTile ? styles.tileGroup : styles.tilePassive}
                      onClick={
                        isTrackTile
                          ? (event) => {
                              event.stopPropagation();
                              setSelectedCellId(tile.id);
                            }
                          : undefined
                      }
                    >
                      <polygon
                        points={pointString([tile.points.n, tile.points.e, tile.points.s, tile.points.w])}
                        fill={tile.cell.color}
                        className={styles.topFace}
                        stroke={isSelected ? 'var(--accent)' : `rgba(10, 10, 10, ${strokeAlpha})`}
                        strokeWidth={isSelected ? 1.45 : 0.45}
                      />
                      {isTrackTile && myWorld.showLabels && tile.cell.count > 0 ? (
                        <text x={tile.points.label[0]} y={tile.points.label[1]} textAnchor="middle" className={styles.tileLabel}>
                          {tile.cell.count}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {myWorld.renderMode === 'terrain3d' && !supportsWebgl ? (
            <div className={styles.modeWarning}>WebGL is not available in this browser. Showing isometric fallback.</div>
          ) : null}

          <div className={styles.mapActions}>
            {use3DMode ? (
              <button type="button" onClick={() => setReset3DSignal((value) => value + 1)}>
                Reset Camera
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCamera((current) => ({ ...current, zoom: clamp(current.zoom * 1.15, 0.65, 4.5) }))}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setCamera((current) => ({ ...current, zoom: clamp(current.zoom * 0.87, 0.65, 4.5) }))}
                >
                  -
                </button>
                <button type="button" onClick={() => setCamera({ zoom: 1, panX: 0, panY: 0 })}>
                  Reset View
                </button>
              </>
            )}
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelBlock}>
            <div className={styles.panelTitle}>Axis Mapping</div>
            <div className={styles.metaLine}>X: {labelForMetric(myWorld.xAxis)}</div>
            <div className={styles.metaLine}>Y: {labelForMetric(myWorld.yAxis)}</div>
            <div className={styles.metaLine}>Height: {labelForMetric(myWorld.elevation)}</div>
            <div className={styles.metaLine}>Biome: {myWorld.colorBy}</div>
          </div>

          <div className={styles.panelBlock}>
            <div className={styles.panelTitle}>Peaks</div>
            <div className={styles.list}>
              {model.peaks.length === 0 ? <div className={styles.muted}>No peaks yet.</div> : null}
              {model.peaks.map((peak) => (
                <button
                  key={peak.id}
                  type="button"
                  className={[styles.listItem, selectedCellId === peak.id ? styles.listItemActive : ''].join(' ').trim()}
                  onClick={() => setSelectedCellId(peak.id)}
                >
                  <span>
                    ({peak.x},{peak.y})
                  </span>
                  <span>{peak.count} tracks</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.panelBlockGrow}>
            <div className={styles.panelTitle}>Cell Inspector</div>
            {!selectedCell ? <div className={styles.muted}>Select a column to inspect.</div> : null}
            {selectedCell ? (
              <>
                <div className={styles.metaLine}>Tracks: {selectedCell.count}</div>
                <div className={styles.metaLine}>Dominant Genre: {winnerFromCounts(selectedCell.genreCounts)}</div>
                <div className={styles.metaLine}>Dominant Label: {winnerFromCounts(selectedCell.labelCounts)}</div>
                <div className={styles.list}>
                  {selectedCell.tracks.map((track) => (
                    <div key={track.track_id} className={styles.trackItem}>
                      <div className={styles.trackTitle}>{track.title_display || track.title}</div>
                      <div className={styles.trackMeta}>
                        {typeof track.bpm === 'number' ? `${Math.round(track.bpm)} BPM` : 'BPM ?'} | {formatDuration(track.duration_seconds)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
