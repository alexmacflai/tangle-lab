import React, { useEffect, useMemo, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { computeRadarDimensions, getTracksForScope } from '../../data/dataUtils';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './CollectionComparator.module.css';

const METRICS = [
  { key: 'avgBpm', label: 'Avg BPM' },
  { key: 'bpmSpread', label: 'BPM Spread' },
  { key: 'avgDuration', label: 'Avg Duration' },
  { key: 'genreDiversity', label: 'Genre Diversity' },
  { key: 'tagDensity', label: 'Tag Density' },
  { key: 'avgRating', label: 'Avg Rating' },
  { key: 'harmonicRichness', label: 'Harmonic Richness' },
  { key: 'labelVariety', label: 'Label Variety' }
];

const SCOPE_COLORS = ['#AB3DFF', '#2CB1A6', '#5B758F'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toLabel(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function buildScopes(collection, selectedPlaylistIds) {
  const scopes = [
    {
      id: 'all',
      label: 'All Collection',
      type: 'all',
      trackIds: null
    }
  ];

  const playlistById = new Map(collection.playlists.map((playlist) => [playlist.playlist_id, playlist]));
  const relations = collection.trackPlaylists;

  const sourceTrackIds = new Map();
  for (const relation of relations) {
    const playlist = playlistById.get(relation.playlist_id);
    const sourceId = playlist?.source_id;
    if (sourceId === null || sourceId === undefined) continue;

    const bucket = sourceTrackIds.get(sourceId) ?? new Set();
    bucket.add(relation.track_id);
    sourceTrackIds.set(sourceId, bucket);
  }

  for (const [sourceId, trackIds] of [...sourceTrackIds.entries()].sort((a, b) => a[0] - b[0])) {
    scopes.push({
      id: `source:${sourceId}`,
      label: `Source ${sourceId}`,
      type: 'source',
      trackIds
    });
  }

  for (const playlistId of [...selectedPlaylistIds]) {
    const playlist = playlistById.get(playlistId);
    if (!playlist) continue;

    const trackIds = new Set(
      relations.filter((relation) => relation.playlist_id === playlistId).map((relation) => relation.track_id)
    );

    scopes.push({
      id: `playlist:${playlistId}`,
      label: toLabel(playlist.display_name ?? playlist.name, `playlist:${playlistId}`),
      type: 'playlist',
      trackIds
    });
  }

  return scopes;
}

function tracksForScope(collection, scope) {
  if (!scope || scope.id === 'all' || !scope.trackIds) return collection.tracks;
  return collection.tracks.filter((track) => scope.trackIds.has(track.track_id));
}

function normalizeMetrics(rawMetrics, baselineMetrics) {
  const normalized = {};

  for (const metric of METRICS) {
    const key = metric.key;
    const baseline = baselineMetrics[key] ?? 0;
    const value = rawMetrics[key] ?? 0;

    if (baseline <= 0) {
      normalized[key] = clamp(value, 0, 1);
      continue;
    }

    normalized[key] = clamp(value / baseline, 0, 1);
  }

  return normalized;
}

function buildMetricData(activeScopes, normalizedByScope) {
  return METRICS.map((metric) => {
    const row = {
      metric: metric.label,
      metricKey: metric.key
    };

    for (const scope of activeScopes) {
      row[scope.id] = normalizedByScope.get(scope.id)?.[metric.key] ?? 0;
    }

    return row;
  });
}

function buildTagCountByTrack(collection, tracks) {
  const trackIdSet = new Set(tracks.map((track) => track.track_id));
  const counts = new Map();

  for (const relation of collection.trackTags) {
    if (!trackIdSet.has(relation.track_id)) continue;
    counts.set(relation.track_id, (counts.get(relation.track_id) ?? 0) + 1);
  }

  return counts;
}

function topMetricTracks(metricKey, tracks, collection) {
  if (!tracks.length) return [];

  if (metricKey === 'avgBpm') {
    return [...tracks].filter((track) => typeof track.bpm === 'number').sort((a, b) => b.bpm - a.bpm);
  }

  if (metricKey === 'bpmSpread') {
    const bpmTracks = tracks.filter((track) => typeof track.bpm === 'number');
    if (!bpmTracks.length) return [];
    const mean = bpmTracks.reduce((sum, track) => sum + track.bpm, 0) / bpmTracks.length;
    return [...bpmTracks].sort((a, b) => Math.abs(b.bpm - mean) - Math.abs(a.bpm - mean));
  }

  if (metricKey === 'avgDuration') {
    return [...tracks]
      .filter((track) => typeof track.duration_seconds === 'number')
      .sort((a, b) => b.duration_seconds - a.duration_seconds);
  }

  if (metricKey === 'genreDiversity') {
    const genreCount = new Map();
    for (const track of tracks) {
      const genre = track.genre_generated || track.genre || 'Unknown Genre';
      genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1);
    }

    return [...tracks].sort((a, b) => {
      const genreA = a.genre_generated || a.genre || 'Unknown Genre';
      const genreB = b.genre_generated || b.genre || 'Unknown Genre';
      return (genreCount.get(genreA) ?? 0) - (genreCount.get(genreB) ?? 0);
    });
  }

  if (metricKey === 'tagDensity') {
    const tagCountByTrack = buildTagCountByTrack(collection, tracks);
    return [...tracks].sort((a, b) => (tagCountByTrack.get(b.track_id) ?? 0) - (tagCountByTrack.get(a.track_id) ?? 0));
  }

  if (metricKey === 'avgRating') {
    return [...tracks]
      .filter((track) => typeof track.star_rating === 'number')
      .sort((a, b) => b.star_rating - a.star_rating);
  }

  if (metricKey === 'harmonicRichness') {
    return [...tracks].sort((a, b) => Number(b.key_note !== null && b.key_note !== undefined) - Number(a.key_note !== null && a.key_note !== undefined));
  }

  if (metricKey === 'labelVariety') {
    const labelCount = new Map();
    for (const track of tracks) {
      const label = toLabel(track.label_display ?? track.label, 'unknown-label');
      labelCount.set(label, (labelCount.get(label) ?? 0) + 1);
    }

    return [...tracks].sort((a, b) => {
      const labelA = toLabel(a.label_display ?? a.label, 'unknown-label');
      const labelB = toLabel(b.label_display ?? b.label, 'unknown-label');
      return (labelCount.get(labelA) ?? 0) - (labelCount.get(labelB) ?? 0);
    });
  }

  return tracks;
}

function buildInsight(activeScopes, rawMetricsByScope) {
  if (activeScopes.length < 2) return null;

  const first = activeScopes[0];
  const second = activeScopes[1];
  const firstMetrics = rawMetricsByScope.get(first.id);
  const secondMetrics = rawMetricsByScope.get(second.id);
  if (!firstMetrics || !secondMetrics) return null;

  let bestMetric = null;
  let bestRatio = 1;
  let winner = first;
  let loser = second;

  for (const metric of METRICS) {
    const a = firstMetrics[metric.key] ?? 0;
    const b = secondMetrics[metric.key] ?? 0;
    const high = Math.max(a, b);
    const low = Math.max(0.00001, Math.min(a, b));
    const ratio = high / low;

    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestMetric = metric;
      winner = a >= b ? first : second;
      loser = a >= b ? second : first;
    }
  }

  if (!bestMetric || bestRatio < 1.15) return null;

  return `${winner.label} has ${bestRatio.toFixed(1)}x ${bestMetric.label.toLowerCase()} versus ${loser.label}.`;
}

function formatTrackTitle(track) {
  return toLabel(track.title_display ?? track.title, `track:${track.track_id}`);
}

export default function CollectionComparator() {
  const collection = useExploreStore((state) => state.collection);
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);

  const scopes = useMemo(
    () => buildScopes(collection, selectedPlaylistIds),
    [collection, selectedPlaylistIds]
  );

  const [activeScopeIds, setActiveScopeIds] = useState(['all']);
  const [activeMetric, setActiveMetric] = useState('avgBpm');

  useEffect(() => {
    setActiveScopeIds((current) => {
      const validIds = new Set(scopes.map((scope) => scope.id));
      const filtered = current.filter((id) => validIds.has(id));
      if (!filtered.length) return ['all'];
      return filtered.slice(0, 3);
    });
  }, [scopes]);

  const scopeById = useMemo(() => new Map(scopes.map((scope) => [scope.id, scope])), [scopes]);

  const activeScopes = activeScopeIds
    .map((scopeId) => scopeById.get(scopeId))
    .filter(Boolean)
    .slice(0, 3);

  const baselineTracks = tracksForScope(collection, scopeById.get('all'));
  const baselineRawMetrics = computeRadarDimensions(baselineTracks, collection);

  const rawMetricsByScope = useMemo(() => {
    const map = new Map();
    for (const scope of activeScopes) {
      const tracks = tracksForScope(collection, scope);
      map.set(scope.id, computeRadarDimensions(tracks, collection));
    }
    return map;
  }, [activeScopes, collection]);

  const normalizedByScope = useMemo(() => {
    const map = new Map();
    for (const scope of activeScopes) {
      const raw = rawMetricsByScope.get(scope.id);
      if (!raw) continue;
      map.set(scope.id, normalizeMetrics(raw, baselineRawMetrics));
    }
    return map;
  }, [activeScopes, baselineRawMetrics, rawMetricsByScope]);

  const radarData = useMemo(
    () => buildMetricData(activeScopes, normalizedByScope),
    [activeScopes, normalizedByScope]
  );

  const colorByScopeId = new Map(activeScopes.map((scope, index) => [scope.id, SCOPE_COLORS[index] || '#5B758F']));
  const insightLine = buildInsight(activeScopes, rawMetricsByScope);

  function toggleScope(scopeId) {
    setActiveScopeIds((current) => {
      if (current.includes(scopeId)) {
        const next = current.filter((id) => id !== scopeId);
        return next.length ? next : ['all'];
      }

      if (current.length >= 3) {
        return [current[0], current[1], scopeId];
      }

      return [...current, scopeId];
    });
  }

  const metricLabelByKey = new Map(METRICS.map((metric) => [metric.key, metric.label]));

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Collection Comparator</div>
          <div className={styles.subtitle}>Overlay up to 3 scopes to compare your library profile.</div>
        </div>
        {insightLine ? <div className={styles.insight}>{insightLine}</div> : null}
      </div>

      <div className={styles.scopeRow}>
        {scopes.map((scope) => {
          const isActive = activeScopeIds.includes(scope.id);
          return (
            <button
              key={scope.id}
              type="button"
              className={[styles.scopePill, isActive ? styles.scopeActive : ''].join(' ').trim()}
              onClick={() => toggleScope(scope.id)}
            >
              {scope.label}
            </button>
          );
        })}
      </div>

      <div className={styles.body}>
        <div className={styles.chartCard}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(91, 117, 143, 0.35)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={({ payload, x, y, textAnchor }) => {
                    const metric = METRICS.find((entry) => entry.label === payload.value);
                    const isActive = metric?.key === activeMetric;
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor={textAnchor}
                        fill={isActive ? '#AB3DFF' : '#93A8BD'}
                        fontSize={11}
                        style={{ cursor: 'pointer' }}
                        onClick={() => metric && setActiveMetric(metric.key)}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis domain={[0, 1]} tickCount={5} stroke="rgba(91, 117, 143, 0.22)" tick={{ fill: '#5B758F', fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => [`${Math.round((Number(value) || 0) * 100)}%`, scopeById.get(name)?.label || name]}
                  contentStyle={{ background: '#071B2E', border: '1px solid #2B465F', borderRadius: 8 }}
                  labelStyle={{ color: '#FFFFFF' }}
                />
                <Legend
                  formatter={(scopeId) => (
                    <span style={{ color: '#B2C3D3', fontSize: 12 }}>
                      {scopeById.get(scopeId)?.label || scopeId}
                    </span>
                  )}
                />
                {activeScopes.map((scope, index) => (
                  <Radar
                    key={scope.id}
                    name={scope.id}
                    dataKey={scope.id}
                    stroke={colorByScopeId.get(scope.id)}
                    fill={colorByScopeId.get(scope.id)}
                    fillOpacity={0.16 + index * 0.06}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.metricBar}>
            {METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                className={[styles.metricButton, metric.key === activeMetric ? styles.metricActive : ''].join(' ').trim()}
                onClick={() => setActiveMetric(metric.key)}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelTitle}>{metricLabelByKey.get(activeMetric)} Drivers</div>
          <div className={styles.scopeSections}>
            {activeScopes.map((scope) => {
              const tracks = tracksForScope(collection, scope);
              const topTracks = topMetricTracks(activeMetric, tracks, collection).slice(0, 8);

              return (
                <div key={scope.id} className={styles.scopeSection}>
                  <div className={styles.scopeSectionHead}>
                    <span className={styles.scopeDot} style={{ background: colorByScopeId.get(scope.id) }} />
                    <span>{scope.label}</span>
                    <span className={styles.scopeTrackCount}>{tracks.length}</span>
                  </div>

                  <div className={styles.scopeTrackList}>
                    {topTracks.map((track) => (
                      <div key={`${scope.id}:${track.track_id}`} className={styles.trackRow}>
                        <div className={styles.trackTitle}>{formatTrackTitle(track)}</div>
                        <div className={styles.trackMeta}>
                          {track.bpm ? `${track.bpm} BPM` : 'BPM ?'} · {track.duration_seconds ? `${Math.round(track.duration_seconds / 60)}m` : '--'}
                        </div>
                      </div>
                    ))}
                    {!topTracks.length ? <div className={styles.empty}>No matching tracks.</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
