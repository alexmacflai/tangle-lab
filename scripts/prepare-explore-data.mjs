#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_INPUT_CANDIDATES = [
  process.env.TANGLE_DB_DUMP,
  path.resolve(process.cwd(), 'db_dump_2026-03-20T18-15-54-502152Z.json'),
  path.resolve(process.cwd(), 'db_dump.json')
].filter(Boolean);
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'tangle-explore/public/db_explore.json');

const GENRE_PALETTE = [
  'House',
  'Techno',
  'Minimal',
  'Breaks',
  'Drum & Bass',
  'Garage',
  'Disco',
  'Electro',
  'Ambient',
  'Hip-Hop',
  'Downtempo',
  'Afro House',
  'UK Bass'
];

const COLOR_PALETTE = [
  { name: 'Brand Purple', hex: '#AB3DFF' },
  { name: 'Signal Teal', hex: '#30B5A8' },
  { name: 'Neon Lime', hex: '#A7E547' },
  { name: 'Sky Blue', hex: '#4EA1FF' },
  { name: 'Violet Pulse', hex: '#AB3DFF' },
  { name: 'Fuchsia', hex: '#FF4D8D' },
  { name: 'Iris Violet', hex: '#8C7BFF' },
  { name: 'Ultraviolet', hex: '#AB3DFF' }
];

const GENRE_BPM_RANGES = {
  House: [118, 128],
  Techno: [126, 142],
  Minimal: [118, 130],
  Breaks: [100, 136],
  'Drum & Bass': [162, 178],
  Garage: [126, 138],
  Disco: [108, 124],
  Electro: [118, 136],
  Ambient: [70, 110],
  'Hip-Hop': [78, 104],
  Downtempo: [80, 106],
  'Afro House': [114, 126],
  'UK Bass': [128, 144]
};

const COMMENT_SNIPPETS = [
  'Prototype fill: mood-forward cut.',
  'Prototype fill: transition-friendly.',
  'Prototype fill: test in warm-up zone.',
  'Prototype fill: strong late-set texture.',
  'Prototype fill: check blend options.'
];

function parseArgs(argv) {
  const args = { input: null, output: DEFAULT_OUTPUT };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--input' && argv[i + 1]) {
      args.input = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--output' && argv[i + 1]) {
      args.output = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--help') {
      console.log('Usage: node scripts/prepare-explore-data.mjs [--input <path>] [--output <path>]');
      process.exit(0);
    }
  }
  if (!args.input) {
    args.input = DEFAULT_INPUT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? null;
  }
  return args;
}

function readJsonWithTrailingCommas(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const cleaned = stripTrailingCommas(raw);
  return JSON.parse(cleaned);
}

function stripTrailingCommas(text) {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      output += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      output += ch;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) {
        j += 1;
      }
      if (text[j] === ']' || text[j] === '}') {
        continue;
      }
    }

    output += ch;
  }

  return output;
}

function fnv1a(input) {
  const str = String(input);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStable(list, seed) {
  return list[seed % list.length];
}

function inferGenre(track, existingGenreName) {
  const existingNumeric = typeof existingGenreName === 'number' ? existingGenreName : null;
  if (existingNumeric !== null && existingNumeric > 0) {
    return pickStable(GENRE_PALETTE, existingNumeric);
  }

  const bpm = track.bpm;
  const seed = fnv1a(`genre:${track.track_id}`);

  if (typeof bpm === 'number') {
    if (bpm < 95) return pickStable(['Downtempo', 'Hip-Hop', 'Breaks'], seed);
    if (bpm < 112) return pickStable(['Disco', 'Breaks', 'Garage'], seed);
    if (bpm < 124) return pickStable(['House', 'Disco', 'Afro House'], seed);
    if (bpm < 132) return pickStable(['House', 'Minimal', 'Techno'], seed);
    if (bpm < 142) return pickStable(['Techno', 'Electro', 'UK Bass'], seed);
    return pickStable(['Drum & Bass', 'Techno', 'Electro'], seed);
  }

  return pickStable(GENRE_PALETTE, seed);
}

function inferColor(track, existingColorId, genre) {
  if (typeof existingColorId === 'number' && existingColorId > 0) {
    return COLOR_PALETTE[(existingColorId - 1) % COLOR_PALETTE.length];
  }

  const keyBase = typeof track.key_note === 'number' ? track.key_note : fnv1a(track.track_id) % COLOR_PALETTE.length;
  const genreOffset = fnv1a(genre) % COLOR_PALETTE.length;
  return COLOR_PALETTE[(keyBase + genreOffset) % COLOR_PALETTE.length];
}

function toDisplayName(value, fallback) {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function isMissing(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function pickFromRange(min, max, seed) {
  return min + (seed % (max - min + 1));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toIsoDateFromEpoch(epochMs) {
  if (typeof epochMs !== 'number') return null;
  const date = new Date(epochMs);
  if (Number.isNaN(date.valueOf())) return null;
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function generateReleaseDate(trackId, earliestAddedAt) {
  const fromHistory = toIsoDateFromEpoch(earliestAddedAt);
  if (fromHistory) return fromHistory;

  const seed = fnv1a(`release:${trackId}`);
  const year = 2012 + (seed % 14);
  const month = 1 + ((seed >> 6) % 12);
  const day = 1 + ((seed >> 11) % 28);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function generateBpm(trackId, genre) {
  const [min, max] = GENRE_BPM_RANGES[genre] ?? [96, 136];
  const seed = fnv1a(`bpm:${trackId}:${genre}`);
  return pickFromRange(min, max, seed);
}

function generateKeyNote(trackId, bpm, genre) {
  const seed = fnv1a(`key:${trackId}:${genre}:${bpm ?? 'x'}`);
  return seed % 12;
}

function generateDuration(trackId, bpm) {
  const seed = fnv1a(`duration:${trackId}:${bpm ?? 'x'}`);
  const base = pickFromRange(145, 420, seed);
  return base;
}

function generateRating(trackId, bpm) {
  const seed = fnv1a(`rating:${trackId}:${bpm ?? 'x'}`) % 100;
  if (seed < 8) return 1;
  if (seed < 30) return 2;
  if (seed < 62) return 3;
  if (seed < 88) return 4;
  return 5;
}

function generateLabel(trackId, albumNameDisplay) {
  if (albumNameDisplay && !albumNameDisplay.startsWith('unknown-album')) {
    return `${albumNameDisplay} Records`;
  }
  const seed = fnv1a(`label:${trackId}`);
  return `Prototype Label ${1 + (seed % 24)}`;
}

function generateComment(trackId, genre, bpm) {
  const seed = fnv1a(`comment:${trackId}:${genre}:${bpm ?? 'x'}`);
  const snippet = COMMENT_SNIPPETS[seed % COMMENT_SNIPPETS.length];
  return `${snippet} ${genre} @ ${bpm} BPM.`;
}

function buildExploreData(raw, inputPath) {
  const tracksRaw = raw.tracks ?? [];
  const trackGenresRaw = raw.track_genres ?? [];
  const trackPlaylistPositionsRaw = raw.track_playlist_positions ?? [];
  const trackTagsRaw = raw.track_tags ?? [];
  const trackArtistsRaw = raw.track_artists ?? [];
  const tagsRaw = raw.tags ?? [];
  const trackColorsRaw = raw.track_colors ?? [];
  const trackAlbumsRaw = raw.track_albums ?? [];
  const albumsRaw = raw.albums ?? [];
  const imagesRaw = raw.images ?? [];

  const genreByTrack = new Map();
  for (const row of trackGenresRaw) {
    if (!genreByTrack.has(row.track_id)) {
      genreByTrack.set(row.track_id, row.genre_name ?? null);
    }
  }

  const groupKeyToId = new Map();
  const groups = [];
  const groupNameByKey = new Map();

  for (const row of tagsRaw) {
    const sourceId = row.source_id ?? -1;
    const tagSource = row.tag_source ?? -1;
    const tagIdAtSource = row.tag_id_at_source ?? -1;
    const key = `${sourceId}:${tagSource}:${tagIdAtSource}`;
    if (!groupNameByKey.has(key) && row.name !== undefined) {
      groupNameByKey.set(key, row.name ?? null);
    }
  }

  function ensureGroupId(row) {
    const sourceId = row.source_id ?? -1;
    const tagSource = row.tag_source ?? -1;
    const tagIdAtSource = row.tag_id_at_source ?? -1;
    const key = `${sourceId}:${tagSource}:${tagIdAtSource}`;

    if (!groupKeyToId.has(key)) {
      const id = groups.length + 1;
      groupKeyToId.set(key, id);
      groups.push({
        id,
        key,
        sourceId,
        tagSource,
        tagIdAtSource,
        nameRaw: groupNameByKey.get(key) ?? null
      });
    }

    return groupKeyToId.get(key);
  }

  for (const row of trackPlaylistPositionsRaw) ensureGroupId(row);
  for (const row of trackTagsRaw) ensureGroupId(row);
  for (const row of tagsRaw) ensureGroupId(row);

  const colorNameById = new Map();
  for (const row of trackColorsRaw) {
    if (row.color_id === undefined) continue;
    if (!colorNameById.has(row.color_id)) {
      colorNameById.set(row.color_id, row.name ?? null);
    }
  }

  const albumByTrack = new Map();
  for (const row of trackAlbumsRaw) {
    if (!albumByTrack.has(row.track_id)) {
      albumByTrack.set(row.track_id, row.album_id ?? null);
    }
  }

  const albumById = new Map((albumsRaw || []).map((a) => [a.album_id, a]));
  const imageById = new Map((imagesRaw || []).map((i) => [i.image_id, i]));

  const artistNameToId = new Map();
  const artistTrackCount = new Map();

  function ensureArtistId(nameRaw) {
    const key = JSON.stringify(nameRaw);
    if (!artistNameToId.has(key)) {
      artistNameToId.set(key, artistNameToId.size + 1);
    }
    return artistNameToId.get(key);
  }

  const trackArtists = [];
  const seenTrackArtist = new Set();
  const artistRawById = new Map();

  for (const row of trackArtistsRaw) {
    if (row.track_id === undefined) continue;
    if (row.artist_name === undefined) continue;

    const artistId = ensureArtistId(row.artist_name);
    artistRawById.set(artistId, row.artist_name);
    const relationKey = `${row.track_id}:${artistId}`;
    if (seenTrackArtist.has(relationKey)) continue;
    seenTrackArtist.add(relationKey);

    trackArtists.push({ track_id: row.track_id, artist_id: artistId });
    artistTrackCount.set(artistId, (artistTrackCount.get(artistId) ?? 0) + 1);
  }

  const artists = Array.from(artistRawById.entries()).map(([id, nameRaw]) => ({
    artist_id: id,
    name: nameRaw,
    display_name: toDisplayName(nameRaw, `artist:${id}`),
    track_count: artistTrackCount.get(id) ?? 0
  }));

  const trackPlaylists = trackPlaylistPositionsRaw.map((row) => ({
    track_id: row.track_id,
    playlist_id: ensureGroupId(row),
    position: row.position ?? null,
    added_at: row.added_at ?? null
  }));

  const trackTags = trackTagsRaw.map((row) => ({
    track_id: row.track_id,
    tag_id: ensureGroupId(row)
  }));

  const playlistTrackCount = new Map();
  for (const rel of trackPlaylists) {
    playlistTrackCount.set(rel.playlist_id, (playlistTrackCount.get(rel.playlist_id) ?? 0) + 1);
  }

  const tagTrackCount = new Map();
  for (const rel of trackTags) {
    tagTrackCount.set(rel.tag_id, (tagTrackCount.get(rel.tag_id) ?? 0) + 1);
  }

  const playlists = groups.map((group) => ({
    playlist_id: group.id,
    source_id: group.sourceId,
    tag_source: group.tagSource,
    tag_id_at_source: group.tagIdAtSource,
    name: group.nameRaw,
    display_name: toDisplayName(group.nameRaw, `playlist:${group.sourceId}:${group.tagIdAtSource}`),
    track_count: playlistTrackCount.get(group.id) ?? 0
  })).filter((playlist) => playlist.track_count > 0);

  const tags = groups.map((group) => ({
    tag_id: group.id,
    source_id: group.sourceId,
    tag_source: group.tagSource,
    tag_id_at_source: group.tagIdAtSource,
    name: group.nameRaw,
    display_name: toDisplayName(group.nameRaw, `tag:${group.sourceId}:${group.tagIdAtSource}`),
    track_count: tagTrackCount.get(group.id) ?? 0
  })).filter((tag) => tag.track_count > 0);

  const earliestAddedAtByTrack = new Map();
  for (const row of trackPlaylistPositionsRaw) {
    if (typeof row.track_id !== 'number') continue;
    if (typeof row.added_at !== 'number') continue;

    const existing = earliestAddedAtByTrack.get(row.track_id);
    if (existing === undefined || row.added_at < existing) {
      earliestAddedAtByTrack.set(row.track_id, row.added_at);
    }
  }

  const genreCount = new Map();
  const enrichmentCounts = {
    bpm: 0,
    key_note: 0,
    release_date: 0,
    label: 0,
    duration_seconds: 0,
    star_rating: 0,
    comments: 0,
    color_id: 0,
    genre: 0,
    color: 0
  };

  const tracks = tracksRaw.map((track) => {
    const existingGenreRaw = genreByTrack.get(track.track_id) ?? null;
    const genreGenerated = inferGenre(track, existingGenreRaw);
    const bpmFilled = isMissing(track.bpm) ? generateBpm(track.track_id, genreGenerated) : track.bpm;
    const keyNoteFilled = isMissing(track.key_note) ? generateKeyNote(track.track_id, bpmFilled, genreGenerated) : track.key_note;
    const colorGenerated = inferColor({ ...track, key_note: keyNoteFilled }, track.color_id, genreGenerated);
    const existingColorRaw = colorNameById.get(track.color_id) ?? null;

    const albumId = albumByTrack.get(track.track_id) ?? null;
    const album = albumId !== null ? albumById.get(albumId) : null;
    const coverImageId = album?.album_cover_image_id ?? null;
    const image = coverImageId !== null ? imageById.get(coverImageId) : null;
    const albumNameDisplay = toDisplayName(album?.name, albumId ? `album:${albumId}` : 'unknown-album');

    const releaseDateFilled = isMissing(track.release_date)
      ? generateReleaseDate(track.track_id, earliestAddedAtByTrack.get(track.track_id))
      : track.release_date;
    const labelFilled = isMissing(track.label) ? generateLabel(track.track_id, albumNameDisplay) : track.label;
    const durationFilled = isMissing(track.duration_seconds) ? generateDuration(track.track_id, bpmFilled) : track.duration_seconds;
    const ratingFilled = isMissing(track.star_rating) ? generateRating(track.track_id, bpmFilled) : track.star_rating;
    const commentsFilled = isMissing(track.comments) ? generateComment(track.track_id, genreGenerated, bpmFilled) : track.comments;
    const colorIdFilled = isMissing(track.color_id)
      ? COLOR_PALETTE.findIndex((color) => color.name === colorGenerated.name) + 1
      : track.color_id;
    const genreFilled = isMissing(existingGenreRaw) ? genreGenerated : existingGenreRaw;
    const colorNameFilled = isMissing(existingColorRaw) ? colorGenerated.name : existingColorRaw;

    if (isMissing(track.bpm)) enrichmentCounts.bpm += 1;
    if (isMissing(track.key_note)) enrichmentCounts.key_note += 1;
    if (isMissing(track.release_date)) enrichmentCounts.release_date += 1;
    if (isMissing(track.label)) enrichmentCounts.label += 1;
    if (isMissing(track.duration_seconds)) enrichmentCounts.duration_seconds += 1;
    if (isMissing(track.star_rating)) enrichmentCounts.star_rating += 1;
    if (isMissing(track.comments)) enrichmentCounts.comments += 1;
    if (isMissing(track.color_id)) enrichmentCounts.color_id += 1;
    if (isMissing(existingGenreRaw)) enrichmentCounts.genre += 1;
    if (isMissing(existingColorRaw)) enrichmentCounts.color += 1;

    genreCount.set(genreGenerated, (genreCount.get(genreGenerated) ?? 0) + 1);

    return {
      track_id: track.track_id,
      title: track.title ?? null,
      title_display: toDisplayName(track.title, `track:${track.track_id}`),
      bpm_raw: track.bpm ?? null,
      bpm: bpmFilled,
      key_note_raw: track.key_note ?? null,
      key_note: keyNoteFilled,
      release_date_raw: track.release_date ?? null,
      release_date: releaseDateFilled,
      label_raw: track.label ?? null,
      label: labelFilled,
      label_display: toDisplayName(labelFilled, 'unknown-label'),
      duration_seconds_raw: track.duration_seconds ?? null,
      duration_seconds: durationFilled,
      star_rating_raw: track.star_rating ?? null,
      star_rating: ratingFilled,
      comments_raw: track.comments ?? null,
      comments: commentsFilled,
      color_id_raw: track.color_id ?? null,
      color_id: colorIdFilled,
      genre_raw: existingGenreRaw,
      genre: genreFilled,
      genre_generated: genreGenerated,
      color_raw: existingColorRaw,
      color: colorNameFilled,
      color_generated: colorGenerated.name,
      color_hex: colorGenerated.hex,
      color_hex_generated: colorGenerated.hex,
      cover_seed: fnv1a(`cover:${track.track_id}`),
      album_id: albumId,
      album_name: album?.name ?? null,
      album_name_display: albumNameDisplay,
      cover_image_id: coverImageId,
      cover_path: typeof image?.path === 'string' ? image.path : null,
      cover_url: typeof image?.url === 'string' ? image.url : null
    };
  });

  const genres = Array.from(genreCount.entries())
    .map(([name, count]) => ({ name, track_count: count }))
    .sort((a, b) => b.track_count - a.track_count);

  const colors = COLOR_PALETTE.map((item) => ({
    name: item.name,
    hex: item.hex,
    track_count: tracks.filter((track) => track.color_generated === item.name || track.color === item.name).length
  }));

  return {
    meta: {
      generated_at: new Date().toISOString(),
      source_file: inputPath,
      track_count: tracks.length,
      playlist_count: playlists.length,
      tag_count: tags.length,
      artist_count: artists.length,
      enrichment: enrichmentCounts,
      schema_version: 1
    },
    tracks,
    playlists,
    tags,
    artists,
    genres,
    colors,
    trackTags,
    trackPlaylists,
    trackArtists
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.input || !fs.existsSync(args.input)) {
    console.error('Input file not found. Pass --input <path> or set TANGLE_DB_DUMP.');
    process.exit(1);
  }

  const raw = readJsonWithTrailingCommas(args.input);
  const prepared = buildExploreData(raw, args.input);

  ensureDir(args.output);
  fs.writeFileSync(args.output, JSON.stringify(prepared, null, 2), 'utf8');

  console.log(`Prepared dataset written to ${args.output}`);
  console.log(
    JSON.stringify(
      {
        tracks: prepared.meta.track_count,
        playlists: prepared.meta.playlist_count,
        tags: prepared.meta.tag_count,
        artists: prepared.meta.artist_count,
        genres: prepared.genres.length,
        colors: prepared.colors.length
      },
      null,
      2
    )
  );
}

main();
