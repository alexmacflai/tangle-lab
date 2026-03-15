export const AXIS_OPTIONS = [
  { value: 'bpm', label: 'BPM' },
  { value: 'releaseYear', label: 'Release Year' },
  { value: 'duration', label: 'Duration' },
  { value: 'rating', label: 'Star Rating' },
  { value: 'playlistFrequency', label: 'Playlist Frequency' },
  { value: 'tagDensity', label: 'Tag Density' },
  { value: 'key', label: 'Harmonic Key' }
];

export const ELEVATION_OPTIONS = [
  { value: 'density', label: 'Track Density' },
  { value: 'avgDuration', label: 'Avg Duration' },
  { value: 'avgRating', label: 'Avg Rating' },
  { value: 'playlistFrequency', label: 'Playlist Frequency' },
  { value: 'avgBpm', label: 'Avg BPM' },
  { value: 'tagDensity', label: 'Tag Density' }
];

export const COLOR_OPTIONS = [
  { value: 'genre', label: 'Genre Biome' },
  { value: 'label', label: 'Label Biome' },
  { value: 'energy', label: 'Energy Gradient' },
  { value: 'key', label: 'Key Ring' },
  { value: 'density', label: 'Density Heat' }
];

export const RENDER_MODE_OPTIONS = [
  { value: 'isometric', label: 'Isometric' },
  { value: 'terrain3d', label: '3D Terrain' }
];

export const DEFAULT_GRID = {
  tilesPerAxis: 9,
  cellsPerTile: 9
};

export const METRIC_LABELS = {
  bpm: 'BPM',
  releaseYear: 'Release Year',
  duration: 'Duration',
  rating: 'Rating',
  playlistFrequency: 'Playlist Frequency',
  tagDensity: 'Tag Density',
  key: 'Harmonic Key',
  density: 'Track Density',
  avgDuration: 'Avg Duration',
  avgRating: 'Avg Rating',
  avgBpm: 'Avg BPM'
};

export function labelForMetric(metric) {
  return METRIC_LABELS[metric] ?? metric;
}
