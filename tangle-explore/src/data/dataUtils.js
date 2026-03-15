export function getTracksForScope(collection, selectedPlaylistIds) {
  if (!collection || !collection.tracks?.length) return [];
  if (!selectedPlaylistIds || selectedPlaylistIds.size === 0) return collection.tracks;

  const allowedTrackIds = new Set(
    collection.trackPlaylists
      .filter((relation) => selectedPlaylistIds.has(relation.playlist_id))
      .map((relation) => relation.track_id)
  );

  return collection.tracks.filter((track) => allowedTrackIds.has(track.track_id));
}

export function bpmToBucket(bpm, size = 8) {
  if (typeof bpm !== 'number') return 'Unknown';
  const lower = Math.floor(bpm / size) * size;
  return `${lower}-${lower + size - 1}`;
}

const NOTE_TO_CAMELOT = {
  0: { number: 8, letter: 'B' },
  1: { number: 3, letter: 'B' },
  2: { number: 10, letter: 'B' },
  3: { number: 5, letter: 'B' },
  4: { number: 12, letter: 'B' },
  5: { number: 7, letter: 'B' },
  6: { number: 2, letter: 'B' },
  7: { number: 9, letter: 'B' },
  8: { number: 4, letter: 'B' },
  9: { number: 11, letter: 'B' },
  10: { number: 6, letter: 'B' },
  11: { number: 1, letter: 'B' }
};

export function keyNoteToCamelot(keyNote) {
  if (typeof keyNote !== 'number') return null;
  const normalized = ((keyNote % 12) + 12) % 12;
  return NOTE_TO_CAMELOT[normalized] ?? null;
}

export function camelotToColor(position) {
  if (!position || typeof position.number !== 'number') return '#5B758F';
  const hue = ((position.number - 1) / 12) * 360;
  return `hsl(${hue}, 75%, 58%)`;
}

export function buildArtistAdjacency(tracks, collection) {
  const trackById = new Set(tracks.map((track) => track.track_id));
  const artistsByTrack = new Map();

  for (const relation of collection.trackArtists) {
    if (!trackById.has(relation.track_id)) continue;
    const bucket = artistsByTrack.get(relation.track_id) ?? [];
    bucket.push(relation.artist_id);
    artistsByTrack.set(relation.track_id, bucket);
  }

  const edgeWeight = new Map();

  for (const artists of artistsByTrack.values()) {
    const unique = [...new Set(artists)].sort((a, b) => a - b);
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const key = `${unique[i]}:${unique[j]}`;
        edgeWeight.set(key, (edgeWeight.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(edgeWeight.entries()).map(([key, weight]) => {
    const [source, target] = key.split(':').map(Number);
    return { source, target, weight };
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeRadarDimensions(tracks, collection) {
  if (!tracks.length) {
    return {
      avgBpm: 0,
      bpmSpread: 0,
      avgDuration: 0,
      genreDiversity: 0,
      tagDensity: 0,
      avgRating: 0,
      harmonicRichness: 0,
      labelVariety: 0
    };
  }

  const bpmValues = tracks.map((track) => track.bpm).filter((value) => typeof value === 'number');
  const durations = tracks
    .map((track) => track.duration_seconds)
    .filter((value) => typeof value === 'number');
  const ratings = tracks.map((track) => track.star_rating).filter((value) => typeof value === 'number');
  const withKey = tracks.filter((track) => typeof track.key_note === 'number').length;
  const uniqueGenres = new Set(tracks.map((track) => track.genre_generated || track.genre).filter(Boolean)).size;
  const uniqueLabels = new Set(tracks.map((track) => track.label).filter(Boolean)).size;
  const trackIds = new Set(tracks.map((track) => track.track_id));
  const uniqueTags = new Set(
    collection.trackTags.filter((relation) => trackIds.has(relation.track_id)).map((relation) => relation.tag_id)
  ).size;

  return {
    avgBpm: average(bpmValues),
    bpmSpread: stdev(bpmValues),
    avgDuration: average(durations),
    genreDiversity: uniqueGenres / Math.max(1, collection.genres.length),
    tagDensity: uniqueTags / tracks.length,
    avgRating: average(ratings) / 5,
    harmonicRichness: withKey / tracks.length,
    labelVariety: uniqueLabels / tracks.length
  };
}

export function normalizePreparedCollection(raw) {
  if (!raw || !raw.tracks) return null;

  return {
    meta: raw.meta ?? null,
    tracks: raw.tracks,
    playlists: raw.playlists ?? [],
    tags: raw.tags ?? [],
    artists: raw.artists ?? [],
    genres: raw.genres ?? [],
    colors: raw.colors ?? [],
    trackTags: raw.trackTags ?? [],
    trackPlaylists: raw.trackPlaylists ?? [],
    trackArtists: raw.trackArtists ?? []
  };
}
