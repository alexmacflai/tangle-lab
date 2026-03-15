import { DEFAULT_GRID } from './myWorldConfig';

function hash32(input) {
  const value = String(input);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(sum, count) {
  return count > 0 ? sum / count : 0;
}

function parseReleaseYear(value) {
  if (typeof value === 'number' && value >= 1000 && value <= 9999) return value;
  if (typeof value !== 'string' || value.length === 0) return null;

  const match = value.match(/^(\d{4})/);
  if (match) return Number(match[1]);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.getUTCFullYear();
}

function seededRatio(seed) {
  return (hash32(seed) % 1000) / 999;
}

function dominantKey(counts) {
  let winner = 'Unknown';
  let winnerCount = -1;

  for (const [value, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }

  return winner;
}

function metricFromTrack(track, metric) {
  switch (metric) {
    case 'bpm':
      return typeof track.bpm === 'number' ? track.bpm : null;
    case 'releaseYear':
      return parseReleaseYear(track.release_date);
    case 'duration':
      return typeof track.duration_seconds === 'number' ? track.duration_seconds : null;
    case 'rating':
      return typeof track.star_rating === 'number' ? track.star_rating : null;
    case 'playlistFrequency':
      return typeof track.playlistCount === 'number' ? track.playlistCount : null;
    case 'tagDensity':
      return typeof track.tagCount === 'number' ? track.tagCount : null;
    case 'key':
      return typeof track.key_note === 'number' ? track.key_note : null;
    default:
      return null;
  }
}

function elevationFromCell(cell, metric) {
  if (cell.count === 0) return 0;

  switch (metric) {
    case 'avgDuration':
      return average(cell.sumDuration, cell.count);
    case 'avgRating':
      return average(cell.sumRating, cell.count);
    case 'playlistFrequency':
      return average(cell.sumPlaylistCount, cell.count);
    case 'avgBpm':
      return average(cell.sumBpm, cell.count);
    case 'tagDensity':
      return average(cell.sumTagCount, cell.count);
    case 'density':
    default:
      return cell.count;
  }
}

function normalizeValue(value, min, max, fallbackSeed) {
  if (typeof value !== 'number' || Number.isNaN(value)) return seededRatio(fallbackSeed);
  if (max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function colorForCell(cell, colorBy) {
  if (cell.count === 0) {
    const hue = 88 - cell.heightRatio * 22;
    const sat = 28 + cell.heightRatio * 26;
    const light = 24 + cell.heightRatio * 30;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  if (colorBy === 'energy') {
    const avgBpm = average(cell.sumBpm, cell.count);
    const ratio = clamp((avgBpm - 75) / 95, 0, 1);
    const hue = 220 - ratio * 210;
    return `hsl(${hue}, 76%, 56%)`;
  }

  if (colorBy === 'key') {
    const key = dominantKey(cell.keyCounts);
    const keyNumber = Number(key);
    const hue = Number.isNaN(keyNumber) ? hash32(key) % 360 : ((keyNumber % 12) + 12) % 12 * 30;
    return `hsl(${hue}, 72%, 56%)`;
  }

  if (colorBy === 'density') {
    const hue = 35 + cell.heightRatio * 165;
    const light = 34 + cell.heightRatio * 36;
    return `hsl(${hue}, 78%, ${light}%)`;
  }

  const token = colorBy === 'label' ? dominantKey(cell.labelCounts) : dominantKey(cell.genreCounts);
  const hue = hash32(token) % 360;
  return `hsl(${hue}, 66%, 58%)`;
}

function smoothGrid(values, gridSize, smoothing) {
  if (smoothing <= 0) return values;

  const iterations = Math.max(1, Math.round(smoothing / 25));
  const strength = Math.min(0.82, smoothing / 100);
  let current = values.slice();

  for (let step = 0; step < iterations; step += 1) {
    const next = current.slice();
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const index = y * gridSize + x;
        let weightedSum = current[index] * 4;
        let weight = 4;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
            const nIndex = ny * gridSize + nx;
            const neighborWeight = dx === 0 || dy === 0 ? 2 : 1;
            weightedSum += current[nIndex] * neighborWeight;
            weight += neighborWeight;
          }
        }

        const blur = weightedSum / weight;
        next[index] = current[index] * (1 - strength) + blur * strength;
      }
    }
    current = next;
  }

  return current;
}

export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function buildMyWorldModel(collection, tracks, settings) {
  const tilesPerAxis = DEFAULT_GRID.tilesPerAxis;
  const cellsPerTile = DEFAULT_GRID.cellsPerTile;
  const maxGridSize = tilesPerAxis * cellsPerTile;
  const adaptiveGridSize = clamp(Math.round(Math.sqrt(Math.max(1, tracks.length)) * 4.5), 24, maxGridSize);
  const gridSize = adaptiveGridSize;
  const totalCells = gridSize * gridSize;

  if (!tracks.length) {
    return {
      gridSize,
      tilesPerAxis,
      cellsPerTile,
      totalCells,
      populatedCells: 0,
      cells: [],
      visibleCells: [],
      peaks: [],
      ranges: {
        x: { min: 0, max: 1 },
        y: { min: 0, max: 1 }
      },
      status: {
        tracks: 0,
        stage: 'empty'
      }
    };
  }

  const scopedTrackIds = new Set(tracks.map((track) => track.track_id));

  const playlistCountByTrack = new Map();
  for (const relation of collection.trackPlaylists) {
    if (!scopedTrackIds.has(relation.track_id)) continue;
    playlistCountByTrack.set(relation.track_id, (playlistCountByTrack.get(relation.track_id) ?? 0) + 1);
  }

  const tagCountByTrack = new Map();
  for (const relation of collection.trackTags) {
    if (!scopedTrackIds.has(relation.track_id)) continue;
    tagCountByTrack.set(relation.track_id, (tagCountByTrack.get(relation.track_id) ?? 0) + 1);
  }

  const enrichedTracks = tracks.map((track) => ({
    ...track,
    releaseYear: parseReleaseYear(track.release_date),
    playlistCount: playlistCountByTrack.get(track.track_id) ?? 0,
    tagCount: tagCountByTrack.get(track.track_id) ?? 0
  }));

  const xValues = enrichedTracks
    .map((track) => metricFromTrack(track, settings.xAxis))
    .filter((value) => typeof value === 'number');
  const yValues = enrichedTracks
    .map((track) => metricFromTrack(track, settings.yAxis))
    .filter((value) => typeof value === 'number');

  const xMin = xValues.length ? Math.min(...xValues) : 0;
  const xMax = xValues.length ? Math.max(...xValues) : 1;
  const yMin = yValues.length ? Math.min(...yValues) : 0;
  const yMax = yValues.length ? Math.max(...yValues) : 1;

  const cells = Array.from({ length: totalCells }, (_, index) => ({
    index,
    x: index % gridSize,
    y: Math.floor(index / gridSize),
    count: 0,
    sumBpm: 0,
    sumDuration: 0,
    sumRating: 0,
    sumPlaylistCount: 0,
    sumTagCount: 0,
    genreCounts: new Map(),
    labelCounts: new Map(),
    keyCounts: new Map(),
    tracks: []
  }));

  for (const track of enrichedTracks) {
    const xRaw = metricFromTrack(track, settings.xAxis);
    const yRaw = metricFromTrack(track, settings.yAxis);

    const xRatio = normalizeValue(xRaw, xMin, xMax, `${track.track_id}:${settings.xAxis}`);
    const yRatio = normalizeValue(yRaw, yMin, yMax, `${track.track_id}:${settings.yAxis}`);

    const x = clamp(Math.floor(xRatio * gridSize), 0, gridSize - 1);
    const y = clamp(Math.floor((1 - yRatio) * gridSize), 0, gridSize - 1);
    const index = y * gridSize + x;
    const cell = cells[index];

    cell.count += 1;
    if (typeof track.bpm === 'number') cell.sumBpm += track.bpm;
    if (typeof track.duration_seconds === 'number') cell.sumDuration += track.duration_seconds;
    if (typeof track.star_rating === 'number') cell.sumRating += track.star_rating;
    cell.sumPlaylistCount += track.playlistCount;
    cell.sumTagCount += track.tagCount;

    const genre = track.genre_generated || track.genre || 'Unknown';
    const label = track.label_display || track.label || 'Unknown';
    const keyNote = typeof track.key_note === 'number' ? String(track.key_note) : 'Unknown';

    cell.genreCounts.set(genre, (cell.genreCounts.get(genre) ?? 0) + 1);
    cell.labelCounts.set(label, (cell.labelCounts.get(label) ?? 0) + 1);
    cell.keyCounts.set(keyNote, (cell.keyCounts.get(keyNote) ?? 0) + 1);

    if (cell.tracks.length < 10) {
      cell.tracks.push(track);
    }
  }

  const populatedCells = cells.filter((cell) => cell.count > 0).length;
  const rawHeights = cells.map((cell) => elevationFromCell(cell, settings.elevation));
  const occupancy = cells.map((cell) => (cell.count > 0 ? 1 : 0));
  const userSmoothing = settings.smoothing ?? 0;
  const sparseRatio = 1 - populatedCells / Math.max(1, totalCells);
  const maxRawHeight = Math.max(1, ...rawHeights);

  const primarySmooth = smoothGrid(rawHeights, gridSize, userSmoothing);
  const spreadField = smoothGrid(
    occupancy,
    gridSize,
    clamp(45 + userSmoothing * 0.8 + sparseRatio * 55, 18, 100)
  );

  const blendedHeights = primarySmooth.map((value, index) => value + spreadField[index] * maxRawHeight * 0.34);
  const smoothed = smoothGrid(blendedHeights, gridSize, clamp(22 + userSmoothing * 0.55, 15, 100));
  const hMax = Math.max(0.0001, ...smoothed);

  const exaggeration = clamp((settings.heightScale ?? 120) / 100, 0.6, 2.8);

  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const value = smoothed[i];
    const normalized = clamp(value / hMax, 0, 1);
    const heightRatio = normalized > 0 ? Math.pow(normalized, 0.72) : 0;
    const heightPx = 2 + heightRatio * (14 + 56 * exaggeration);

    cell.heightRaw = value;
    cell.heightRatio = heightRatio;
    cell.heightPx = heightPx;
    cell.color = colorForCell(cell, settings.colorBy);
  }

  const visibleCells = cells.filter((cell) => cell.count > 0 || cell.heightRatio > 0.004);
  visibleCells.sort((a, b) => a.x + a.y - (b.x + b.y) || a.y - b.y);

  const peaks = [...cells]
    .filter((cell) => cell.count > 0)
    .sort((a, b) => b.heightPx - a.heightPx || b.count - a.count)
    .slice(0, 8)
    .map((cell) => ({
      id: cell.index,
      x: cell.x,
      y: cell.y,
      count: cell.count,
      title: cell.tracks[0]?.title_display || cell.tracks[0]?.title || 'Track'
    }));

  return {
    gridSize,
    tilesPerAxis,
    cellsPerTile,
    totalCells,
    populatedCells,
    cells,
    visibleCells,
    peaks,
    ranges: {
      x: { min: xMin, max: xMax },
      y: { min: yMin, max: yMax }
    },
    status: {
      tracks: tracks.length,
      stage: 'ready'
    }
  };
}

export function pointString(points) {
  return points.map((point) => `${point[0]},${point[1]}`).join(' ');
}
