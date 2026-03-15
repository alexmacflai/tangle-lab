import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getTracksForScope } from '../../data/dataUtils';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './Timeline.module.css';

const MARGIN = { top: 20, right: 14, bottom: 38, left: 46 };

function hash32(input) {
  const value = String(input);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function asLabel(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function parseYear(input) {
  if (typeof input === 'number') {
    if (input > 1000000000000) {
      const date = new Date(input);
      if (!Number.isNaN(date.valueOf())) return date.getUTCFullYear();
    }
    if (input >= 1000 && input <= 9999) return input;
    return null;
  }

  if (typeof input === 'string') {
    const direct = input.match(/^(\d{4})/);
    if (direct) return Number(direct[1]);

    const parsed = new Date(input);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.getUTCFullYear();
    }
  }

  return null;
}

function pickDominant(map) {
  let bestKey = null;
  let bestCount = -1;

  for (const [key, count] of map.entries()) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }

  return bestKey;
}

function clampRange(start, end, minYear, maxYear) {
  let nextStart = Math.max(minYear, Math.min(maxYear, start));
  let nextEnd = Math.max(minYear, Math.min(maxYear, end));

  if (nextStart > nextEnd) {
    if (start !== nextStart) {
      nextStart = nextEnd;
    } else {
      nextEnd = nextStart;
    }
  }

  return { start: nextStart, end: nextEnd };
}

function buildBaseTimelineData(collection, tracks, groupBy) {
  const tagsById = new Map(
    collection.tags.map((tag) => [tag.tag_id, asLabel(tag.display_name ?? tag.name, `tag:${tag.tag_id}`)])
  );
  const tagWeightById = new Map(collection.tags.map((tag) => [tag.tag_id, tag.track_count ?? 0]));

  const playlistsById = new Map(collection.playlists.map((playlist) => [playlist.playlist_id, playlist]));

  const tagsByTrack = new Map();
  for (const relation of collection.trackTags) {
    const bucket = tagsByTrack.get(relation.track_id) ?? [];
    bucket.push(relation.tag_id);
    tagsByTrack.set(relation.track_id, bucket);
  }

  const playlistLinksByTrack = new Map();
  for (const relation of collection.trackPlaylists) {
    const bucket = playlistLinksByTrack.get(relation.track_id) ?? [];
    bucket.push(relation);
    playlistLinksByTrack.set(relation.track_id, bucket);
  }

  const items = [];
  const knownYears = new Set();

  for (const track of tracks) {
    const playlistLinks = playlistLinksByTrack.get(track.track_id) ?? [];

    let year = parseYear(track.release_date);
    if (year === null && playlistLinks.length) {
      let earliestAddedAt = null;
      for (const relation of playlistLinks) {
        if (typeof relation.added_at !== 'number') continue;
        if (earliestAddedAt === null || relation.added_at < earliestAddedAt) {
          earliestAddedAt = relation.added_at;
        }
      }
      year = parseYear(earliestAddedAt);
    }

    if (typeof year === 'number') {
      knownYears.add(year);
    }

    let groupKey;
    let groupLabel;

    if (groupBy === 'tag') {
      const tagIds = [...new Set(tagsByTrack.get(track.track_id) ?? [])];
      if (!tagIds.length) {
        groupKey = 'no-tag';
        groupLabel = 'No Tag';
      } else {
        tagIds.sort((a, b) => (tagWeightById.get(b) ?? 0) - (tagWeightById.get(a) ?? 0));
        const primaryTagId = tagIds[0];
        groupKey = `tag:${primaryTagId}`;
        groupLabel = tagsById.get(primaryTagId) ?? `tag:${primaryTagId}`;
      }
    } else {
      const genre = track.genre_generated || track.genre || 'Unknown Genre';
      groupKey = `genre:${genre}`;
      groupLabel = String(genre);
    }

    const sourceCounts = new Map();
    for (const relation of playlistLinks) {
      const playlist = playlistsById.get(relation.playlist_id);
      const sourceId = playlist?.source_id;
      const sourceLabel = sourceId === null || sourceId === undefined ? 'Unknown Source' : `Source ${sourceId}`;
      sourceCounts.set(sourceLabel, (sourceCounts.get(sourceLabel) ?? 0) + 1);
    }
    const sourceLabel = pickDominant(sourceCounts) ?? 'Unknown Source';

    items.push({
      trackId: track.track_id,
      trackTitle: asLabel(track.title_display ?? track.title, `track:${track.track_id}`),
      trackBpm: typeof track.bpm === 'number' ? track.bpm : null,
      trackYear: typeof year === 'number' ? year : null,
      groupKey,
      groupLabel,
      sourceLabel
    });
  }

  const sortedYears = [...knownYears].sort((a, b) => a - b);
  const fallbackYear = new Date().getUTCFullYear();
  const minYear = sortedYears[0] ?? fallbackYear;
  const maxYear = sortedYears[sortedYears.length - 1] ?? fallbackYear;

  return {
    items,
    minYear,
    maxYear
  };
}

function buildTimelineView(base, range, colorBy, viewMode) {
  const yearRange = clampRange(range.start, range.end, base.minYear, base.maxYear);

  const yearBuckets = [];
  for (let year = yearRange.start; year <= yearRange.end; year += 1) {
    yearBuckets.push(year);
  }

  const hasUnknownYear = base.items.some((item) => item.trackYear === null);
  const unknownYear = yearRange.end + 1;
  if (hasUnknownYear) yearBuckets.push(unknownYear);

  const groupCounts = new Map();
  const groupSourceCounts = new Map();
  const sliceTracks = new Map();

  for (const item of base.items) {
    const bucketYear = item.trackYear === null ? unknownYear : item.trackYear;
    if (bucketYear !== unknownYear && (bucketYear < yearRange.start || bucketYear > yearRange.end)) {
      continue;
    }

    const count = groupCounts.get(item.groupKey) ?? { label: item.groupLabel, total: 0 };
    count.total += 1;
    groupCounts.set(item.groupKey, count);

    const sourceMap = groupSourceCounts.get(item.groupKey) ?? new Map();
    sourceMap.set(item.sourceLabel, (sourceMap.get(item.sourceLabel) ?? 0) + 1);
    groupSourceCounts.set(item.groupKey, sourceMap);

    const sliceKey = `${item.groupKey}|${bucketYear}`;
    const list = sliceTracks.get(sliceKey) ?? [];
    list.push(item);
    sliceTracks.set(sliceKey, list);
  }

  const groupKeys = [...groupCounts.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([key]) => key);

  const rowsByYear = new Map(yearBuckets.map((year) => [year, { year }]));
  for (const key of groupKeys) {
    for (const year of yearBuckets) {
      rowsByYear.get(year)[key] = 0;
    }
  }

  for (const [sliceKey, list] of sliceTracks.entries()) {
    const [groupKey, yearToken] = sliceKey.split('|');
    const year = Number(yearToken);
    const row = rowsByYear.get(year);
    if (!row) continue;
    row[groupKey] = list.length;
  }

  const rows = yearBuckets.map((year) => rowsByYear.get(year));

  let series = [];
  let yMin = 0;
  let yMax = 0;

  if (viewMode === 'streamgraph' && groupKeys.length > 0 && rows.length > 0) {
    const stackGenerator = d3.stack().keys(groupKeys).offset(d3.stackOffsetWiggle);
    series = stackGenerator(rows);

    yMin = d3.min(series, (layer) => d3.min(layer, (row) => row[0])) ?? 0;
    yMax = d3.max(series, (layer) => d3.max(layer, (row) => row[1])) ?? 0;

    if (Math.abs(yMax - yMin) < 0.001) {
      yMax += 1;
      yMin -= 1;
    }
  }

  const groupDominantSource = new Map();
  for (const [groupKey, sourceMap] of groupSourceCounts.entries()) {
    groupDominantSource.set(groupKey, pickDominant(sourceMap) ?? 'Unknown Source');
  }

  const sourceKeys = [...new Set(base.items.map((item) => item.sourceLabel))];
  const sourceColors = d3.scaleOrdinal(sourceKeys, d3.schemeTableau10);

  function colorForGroup(groupKey) {
    if (colorBy === 'source') {
      return sourceColors(groupDominantSource.get(groupKey) ?? 'Unknown Source');
    }

    const hue = hash32(groupKey) % 360;
    return `hsl(${hue}, 72%, 56%)`;
  }

  const allVisibleTracks = [];
  for (const list of sliceTracks.values()) {
    allVisibleTracks.push(...list);
  }

  const bpmValues = allVisibleTracks
    .map((item) => item.trackBpm)
    .filter((value) => typeof value === 'number');

  const bpmMin = Math.max(40, (d3.min(bpmValues) ?? 90) - 6);
  const bpmMax = (d3.max(bpmValues) ?? 140) + 6;

  return {
    yearRange,
    yearBuckets,
    unknownYear,
    hasUnknownYear,
    groupKeys,
    groupCounts,
    groupDominantSource,
    rows,
    series,
    yMin,
    yMax,
    sliceTracks,
    colorForGroup,
    sourceColors,
    bpmMin,
    bpmMax,
    tracks: allVisibleTracks
  };
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

export default function Timeline() {
  const collection = useExploreStore((state) => state.collection);
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const timeline = useExploreStore((state) => state.timeline);

  const tracks = useMemo(
    () => getTracksForScope(collection, selectedPlaylistIds),
    [collection, selectedPlaylistIds]
  );

  const base = useMemo(
    () => buildBaseTimelineData(collection, tracks, timeline.groupBy),
    [collection, tracks, timeline.groupBy]
  );

  const [yearRange, setYearRange] = useState({ start: base.minYear, end: base.maxYear });
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    setYearRange({ start: base.minYear, end: base.maxYear });
    setSelection(null);
  }, [base.minYear, base.maxYear, timeline.groupBy, timeline.viewMode, timeline.colorBy]);

  const view = useMemo(
    () => buildTimelineView(base, yearRange, timeline.colorBy, timeline.viewMode),
    [base, yearRange, timeline.colorBy, timeline.viewMode]
  );

  const chartWrapRef = useRef(null);
  const chartSize = useElementSize(chartWrapRef);

  const innerWidth = Math.max(120, chartSize.width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(120, chartSize.height - MARGIN.top - MARGIN.bottom);

  const xDomainStart = view.yearRange.start;
  const xDomainCandidate = view.yearBuckets[view.yearBuckets.length - 1] ?? view.yearRange.end;
  const xDomainEnd = xDomainCandidate === xDomainStart ? xDomainStart + 1 : xDomainCandidate;

  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([xDomainStart, xDomainEnd])
        .range([0, innerWidth]),
    [innerWidth, xDomainEnd, xDomainStart]
  );

  const streamYScale = useMemo(
    () => d3.scaleLinear().domain([view.yMin, view.yMax]).range([innerHeight, 0]).nice(),
    [view.yMin, view.yMax, innerHeight]
  );

  const bpmYScale = useMemo(
    () => d3.scaleLinear().domain([view.bpmMin, view.bpmMax]).range([innerHeight, 0]).nice(),
    [view.bpmMin, view.bpmMax, innerHeight]
  );

  const areaPath = useMemo(
    () =>
      d3
        .area()
        .x((row) => xScale(row.data.year))
        .y0((row) => streamYScale(row[0]))
        .y1((row) => streamYScale(row[1]))
        .curve(d3.curveCatmullRom.alpha(0.6)),
    [streamYScale, xScale]
  );

  const xTickValues = useMemo(() => {
    if (!view.yearBuckets.length) return [];
    if (view.yearBuckets.length <= 8) return view.yearBuckets;

    const tickCount = Math.min(7, view.yearBuckets.length);
    const knownMax = view.hasUnknownYear ? view.unknownYear - 1 : view.yearBuckets[view.yearBuckets.length - 1];
    const knownTicks = d3.ticks(view.yearRange.start, knownMax, tickCount)
      .map((value) => Math.round(value))
      .filter((value, index, arr) => arr.indexOf(value) === index);

    if (view.hasUnknownYear) knownTicks.push(view.unknownYear);
    return knownTicks;
  }, [view]);

  const legendEntries = view.groupKeys.slice(0, 8).map((groupKey) => ({
    key: groupKey,
    label: view.groupCounts.get(groupKey)?.label ?? groupKey,
    count: view.groupCounts.get(groupKey)?.total ?? 0,
    color: view.colorForGroup(groupKey)
  }));

  function setRangeStart(nextStart) {
    setYearRange((current) => clampRange(nextStart, current.end, base.minYear, base.maxYear));
  }

  function setRangeEnd(nextEnd) {
    setYearRange((current) => clampRange(current.start, nextEnd, base.minYear, base.maxYear));
  }

  function setSlice(groupKey, year) {
    setSelection({ groupKey, year });
  }

  const selectedTracks = selection
    ? view.sliceTracks.get(`${selection.groupKey}|${selection.year}`) ?? []
    : [];

  const selectedLabel = selection
    ? `${view.groupCounts.get(selection.groupKey)?.label ?? selection.groupKey} · ${selection.year === view.unknownYear ? 'Unknown' : selection.year}`
    : null;

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Timeline</div>
        <div className={styles.headerMeta}>
          {view.tracks.length} tracks in scope · {view.groupKeys.length} groups · {timeline.viewMode === 'streamgraph' ? 'Streamgraph' : 'BPM Axis'}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.chartArea}>
          <div ref={chartWrapRef} className={styles.chartWrap}>
            {chartSize.width > 0 && chartSize.height > 0 ? (
              <svg width={chartSize.width} height={chartSize.height}>
                <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
                  {timeline.viewMode === 'streamgraph' && view.series.length > 0
                    ? view.series.map((layer) => (
                        <path
                          key={layer.key}
                          d={areaPath(layer)}
                          fill={view.colorForGroup(layer.key)}
                          fillOpacity={selection && selection.groupKey !== layer.key ? 0.28 : 0.84}
                          stroke="rgba(2, 14, 25, 0.32)"
                          strokeWidth={1}
                          onClick={(event) => {
                            const [pointerX] = d3.pointer(event, event.currentTarget.ownerSVGElement);
                            const yearAtPointer = xScale.invert(pointerX - MARGIN.left);
                            const nearestYear = view.yearBuckets.reduce((best, year) =>
                              Math.abs(year - yearAtPointer) < Math.abs(best - yearAtPointer) ? year : best
                            );
                            setSlice(layer.key, nearestYear);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      ))
                    : null}

                  {timeline.viewMode === 'bpm-axis'
                    ? view.tracks.map((item) => {
                        const year = item.trackYear === null ? view.unknownYear : item.trackYear;
                        const jitter = ((hash32(`x:${item.trackId}`) % 1000) / 1000 - 0.5) * 10;
                        const cx = xScale(year) + jitter;
                        const cy = bpmYScale(item.trackBpm ?? view.bpmMin);
                        const key = `${item.trackId}:${year}`;
                        const isUnknownBpm = item.trackBpm === null;

                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={isUnknownBpm ? 3.3 : 4}
                            fill={isUnknownBpm ? 'transparent' : view.colorForGroup(item.groupKey)}
                            stroke={view.colorForGroup(item.groupKey)}
                            strokeWidth={isUnknownBpm ? 1.5 : 1}
                            opacity={selection && selection.groupKey !== item.groupKey ? 0.25 : 0.9}
                            onClick={() => setSlice(item.groupKey, year)}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })
                    : null}

                  <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="var(--border)" />
                  <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="var(--border)" />

                  {xTickValues.map((tick) => {
                    const x = xScale(tick);
                    const isUnknown = view.hasUnknownYear && tick === view.unknownYear;
                    return (
                      <g key={tick} transform={`translate(${x}, 0)`}>
                        <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="rgba(91, 117, 143, 0.25)" strokeDasharray="3 4" />
                        <text x={0} y={innerHeight + 18} textAnchor="middle" className={styles.axisTick}>
                          {isUnknown ? 'Unknown' : tick}
                        </text>
                      </g>
                    );
                  })}

                  {(timeline.viewMode === 'streamgraph'
                    ? d3.ticks(streamYScale.domain()[0], streamYScale.domain()[1], 5)
                    : d3.ticks(view.bpmMin, view.bpmMax, 6)
                  ).map((tick) => {
                    const y = timeline.viewMode === 'streamgraph' ? streamYScale(tick) : bpmYScale(tick);
                    return (
                      <g key={tick} transform={`translate(0, ${y})`}>
                        <line x1={0} y1={0} x2={innerWidth} y2={0} stroke="rgba(91, 117, 143, 0.2)" />
                        <text x={-10} y={4} textAnchor="end" className={styles.axisTick}>
                          {Math.round(tick)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            ) : null}
          </div>

          <div className={styles.rangeWrap}>
            <div className={styles.rangeLabel}>
              Time Scope: {yearRange.start} - {yearRange.end}
            </div>
            <div className={styles.rangeInputs}>
              <input
                type="range"
                min={base.minYear}
                max={base.maxYear}
                value={yearRange.start}
                disabled={base.minYear === base.maxYear}
                onChange={(event) => setRangeStart(Number(event.target.value))}
              />
              <input
                type="range"
                min={base.minYear}
                max={base.maxYear}
                value={yearRange.end}
                disabled={base.minYear === base.maxYear}
                onChange={(event) => setRangeEnd(Number(event.target.value))}
              />
            </div>
          </div>

          <div className={styles.legend}>
            {legendEntries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={styles.legendItem}
                onClick={() => setSlice(entry.key, view.hasUnknownYear ? view.unknownYear : yearRange.end)}
              >
                <span className={styles.legendSwatch} style={{ background: entry.color }} />
                <span className={styles.legendLabel}>{entry.label}</span>
                <span className={styles.legendCount}>{entry.count}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelTitle}>Slice Inspector</div>
          {selection ? (
            <>
              <div className={styles.panelSubtitle}>{selectedLabel}</div>
              <div className={styles.panelCount}>{selectedTracks.length} tracks</div>
              <div className={styles.trackList}>
                {selectedTracks.slice(0, 20).map((item) => (
                  <div key={`${item.trackId}:${item.trackTitle}`} className={styles.trackRow}>
                    <div className={styles.trackTitle}>{item.trackTitle}</div>
                    <div className={styles.trackMeta}>
                      {item.trackBpm ? `${item.trackBpm} BPM` : 'BPM ?'} · {item.sourceLabel}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.panelHint}>Click a stream band region or BPM dot to inspect a year slice.</div>
          )}
        </aside>
      </div>
    </section>
  );
}
