import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceX, forceY } from 'd3-force';
import { getTracksForScope } from '../../data/dataUtils';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './GraphNodes.module.css';

const TRACK_PREFIX = 'track:';
const CLUSTER_PREFIX = 'cluster:';
const COMMENT_PREFIX = 'comment:';
const HOVER_DELAY_MS = 200;
const HOVER_EXIT_MS = 80;
const COVER_TRANSITION_EASING = 0.28;
const CLUSTER_COLOR = '#AB3DFF';
const TRACK_COLOR = '#16314A';
const TRACK_DIM_COLOR = '#071B2E';
const CLUSTER_NODE_SIZE_PX = { base: 8, min: 6, max: 11 };
const TRACK_NODE_SIZE_PX = { base: 7.5, min: 5.25, max: 10.5 };
const COVER_NODE_SIZE_PX = { base: 64, min: 52, max: 86 };
const GRID_BASE_SPACING = 28;
const GRID_MIN_SCREEN_SPACING = 18;
const GRID_DOT_SCREEN_SIZE = 2;
const CLUSTER_LABEL_BASE_OPACITY = 0.4;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GROUP_LAYOUT_PROFILES = {
  playlist: {
    clusterSpacing: 158,
    clusterPull: 0.27,
    trackPull: 0.095,
    linkDistance: 36,
    linkStrength: 0.38,
    chargeBase: -95,
    chargeScale: -62,
    clusterCollide: 13.5,
    trackCollide: 6.8
  },
  artist: {
    clusterSpacing: 192,
    clusterPull: 0.24,
    trackPull: 0.085,
    linkDistance: 40,
    linkStrength: 0.34,
    chargeBase: -108,
    chargeScale: -68,
    clusterCollide: 14.5,
    trackCollide: 6.6
  },
  genre: {
    clusterSpacing: 108,
    clusterPull: 0.31,
    trackPull: 0.11,
    linkDistance: 31,
    linkStrength: 0.44,
    chargeBase: -80,
    chargeScale: -44,
    clusterCollide: 12.2,
    trackCollide: 6.2
  },
  label: {
    clusterSpacing: 112,
    clusterPull: 0.31,
    trackPull: 0.112,
    linkDistance: 31,
    linkStrength: 0.44,
    chargeBase: -82,
    chargeScale: -46,
    clusterCollide: 12.2,
    trackCollide: 6.2
  }
};

function hash32(input) {
  const value = String(input);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getSpacingScale(mapDensity) {
  const clamped = clamp(mapDensity, 0, 100);
  if (clamped === 50) return 1;
  if (clamped < 50) return lerp(0.42, 1, clamped / 50);
  return lerp(1, 2.4, (clamped - 50) / 50);
}

function getLayoutProfile(groupBy) {
  return GROUP_LAYOUT_PROFILES[groupBy] ?? GROUP_LAYOUT_PROFILES.playlist;
}

function getVisibilityThresholds(labelsThresholdValue) {
  const t = clamp(labelsThresholdValue, 0, 100);
  if (t <= 50) {
    const progress = t / 50;
    return {
      labelClusterThreshold: Math.round(lerp(15, 25, progress)),
      coverTrackThreshold: Math.round(lerp(40, 60, progress))
    };
  }

  const progress = (t - 50) / 50;
  return {
    labelClusterThreshold: Math.round(lerp(25, 40, progress)),
    coverTrackThreshold: Math.round(lerp(60, 100, progress))
  };
}

function addTrackToRelation(map, relation, relationKey, trackKey = 'track_id') {
  const bucket = map.get(relation[trackKey]) ?? [];
  bucket.push(relation[relationKey]);
  map.set(relation[trackKey], bucket);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function setsAreEqual(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function buildIndexes(collection) {
  const playlistById = new Map(collection.playlists.map((playlist) => [playlist.playlist_id, playlist]));
  const tagById = new Map(collection.tags.map((tag) => [tag.tag_id, tag]));
  const artistById = new Map(collection.artists.map((artist) => [artist.artist_id, artist]));

  const trackPlaylistsByTrack = new Map();
  const trackTagsByTrack = new Map();
  const trackArtistsByTrack = new Map();

  for (const relation of collection.trackPlaylists) {
    addTrackToRelation(trackPlaylistsByTrack, relation, 'playlist_id');
  }
  for (const relation of collection.trackTags) {
    addTrackToRelation(trackTagsByTrack, relation, 'tag_id');
  }
  for (const relation of collection.trackArtists) {
    addTrackToRelation(trackArtistsByTrack, relation, 'artist_id');
  }

  return {
    playlistById,
    tagById,
    artistById,
    trackPlaylistsByTrack,
    trackTagsByTrack,
    trackArtistsByTrack
  };
}

function getTrackClusterEntries(track, groupBy, indexes) {
  if (groupBy === 'genre') {
    const value = track.genre_generated || track.genre || 'unknown-genre';
    return [{ key: value, label: String(value) }];
  }

  if (groupBy === 'label') {
    const value = track.label_display || track.label || 'unknown-label';
    return [{ key: value, label: String(value) }];
  }

  if (groupBy === 'playlist') {
    const playlistIds = indexes.trackPlaylistsByTrack.get(track.track_id) ?? [];
    if (!playlistIds.length) {
      return [{ key: 'unassigned-playlist', label: 'Unassigned Playlist' }];
    }
    return [...new Set(playlistIds)].map((playlistId) => {
      const playlist = indexes.playlistById.get(playlistId);
      const playlistLabel = playlist?.display_name ?? playlist?.name ?? `playlist:${playlistId}`;
      return {
        key: String(playlistId),
        label: String(playlistLabel)
      };
    });
  }

  if (groupBy === 'tag') {
    const tagIds = indexes.trackTagsByTrack.get(track.track_id) ?? [];
    if (!tagIds.length) {
      return [{ key: 'unassigned-tag', label: 'Unassigned Tag' }];
    }
    return [...new Set(tagIds)].map((tagId) => {
      const tag = indexes.tagById.get(tagId);
      const tagLabel = tag?.display_name ?? tag?.name ?? `tag:${tagId}`;
      return {
        key: String(tagId),
        label: String(tagLabel)
      };
    });
  }

  const artistIds = indexes.trackArtistsByTrack.get(track.track_id) ?? [];
  if (!artistIds.length) {
    return [{ key: 'unknown-artist', label: 'Unknown Artist' }];
  }

  return [...new Set(artistIds)].map((artistId) => {
    const artist = indexes.artistById.get(artistId);
    const artistLabel = artist?.display_name ?? artist?.name ?? `artist:${artistId}`;
    return {
      key: String(artistId),
      label: String(artistLabel)
    };
  });
}

function buildClusterAnchorMap(clusterNodes, groupBy, mapDensity) {
  const profile = getLayoutProfile(groupBy);
  const spacingScale = getSpacingScale(mapDensity);
  const spacing = profile.clusterSpacing * spacingScale;
  const phase = (hash32(`cluster-phase:${groupBy}`) % 6283) / 1000;
  const sortedNodes = [...clusterNodes].sort(
    (left, right) => right.memberCount - left.memberCount || left.id.localeCompare(right.id)
  );
  const anchorByClusterId = new Map();

  sortedNodes.forEach((node, index) => {
    const radius = spacing * Math.sqrt(index + 1);
    const angle = index * GOLDEN_ANGLE + phase;
    anchorByClusterId.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    });
  });

  return anchorByClusterId;
}

function buildGraphData({
  tracks,
  commentNodes,
  groupBy,
  mapDensity,
  focusHighlights,
  highlightedNodeIds,
  collapsedClusterIds,
  indexes
}) {
  const shouldFocusHighlights = focusHighlights && highlightedNodeIds.size > 0;
  const trackNodeById = new Map();
  const clusterNodeById = new Map();
  const clusterMembers = new Map();
  const clusterIdsByTrackId = new Map();
  const links = [];

  for (const track of tracks) {
    const trackNodeId = `${TRACK_PREFIX}${track.track_id}`;
    const artistNames = [...new Set(indexes.trackArtistsByTrack.get(track.track_id) ?? [])]
      .map((artistId) => {
        const artist = indexes.artistById.get(artistId);
        return String(artist?.display_name ?? artist?.name ?? `artist:${artistId}`);
      });
    const playlistNames = [...new Set(indexes.trackPlaylistsByTrack.get(track.track_id) ?? [])]
      .map((playlistId) => {
        const playlist = indexes.playlistById.get(playlistId);
        return String(playlist?.display_name ?? playlist?.name ?? `playlist:${playlistId}`);
      });

    trackNodeById.set(trackNodeId, {
      id: trackNodeId,
      type: 'track',
      trackId: track.track_id,
      label: String(track.title_display ?? track.title ?? `track:${track.track_id}`),
      artistLabel: artistNames.length ? artistNames.join(', ') : 'Unknown Artist',
      playlistLabels: playlistNames,
      colorHex: track.color_hex_generated || track.color_hex,
      bpm: track.bpm,
      genre: track.genre_generated || track.genre
    });

    const clusterEntries = getTrackClusterEntries(track, groupBy, indexes);
    const clusterIdsForTrack = [];

    for (const cluster of clusterEntries) {
      const clusterNodeId = `${CLUSTER_PREFIX}${groupBy}:${cluster.key}`;
      clusterIdsForTrack.push(clusterNodeId);

      if (!clusterNodeById.has(clusterNodeId)) {
        clusterNodeById.set(clusterNodeId, {
          id: clusterNodeId,
          type: 'cluster',
          label: cluster.label,
          memberCount: 0,
          groupBy
        });
      }

      const clusterNode = clusterNodeById.get(clusterNodeId);
      clusterNode.memberCount += 1;

      const members = clusterMembers.get(clusterNodeId) ?? new Set();
      members.add(trackNodeId);
      clusterMembers.set(clusterNodeId, members);

      links.push({
        source: clusterNodeId,
        target: trackNodeId,
        sourceId: clusterNodeId,
        targetId: trackNodeId
      });
    }

    clusterIdsByTrackId.set(trackNodeId, clusterIdsForTrack);
  }

  let visibleTrackNodeIds = new Set(trackNodeById.keys());

  for (const clusterId of collapsedClusterIds) {
    const members = clusterMembers.get(clusterId);
    if (!members) continue;

    for (const trackNodeId of members) {
      if (!highlightedNodeIds.has(trackNodeId)) {
        visibleTrackNodeIds.delete(trackNodeId);
      }
    }
  }

  if (shouldFocusHighlights) {
    const focusTrackIds = new Set();

    for (const highlightedId of highlightedNodeIds) {
      if (highlightedId.startsWith(TRACK_PREFIX)) {
        if (visibleTrackNodeIds.has(highlightedId)) {
          focusTrackIds.add(highlightedId);
        }
        continue;
      }

      if (highlightedId.startsWith(CLUSTER_PREFIX)) {
        const members = clusterMembers.get(highlightedId) ?? new Set();
        for (const trackNodeId of members) {
          if (visibleTrackNodeIds.has(trackNodeId) || highlightedNodeIds.has(trackNodeId)) {
            focusTrackIds.add(trackNodeId);
          }
        }
      }
    }

    visibleTrackNodeIds = focusTrackIds;
  }

  const visibleLinks = links.filter((link) => visibleTrackNodeIds.has(link.targetId));
  const visibleClusterIds = new Set();

  if (shouldFocusHighlights) {
    for (const link of visibleLinks) {
      visibleClusterIds.add(link.sourceId);
    }
    for (const highlightedId of highlightedNodeIds) {
      if (highlightedId.startsWith(CLUSTER_PREFIX)) {
        visibleClusterIds.add(highlightedId);
      }
    }
  } else {
    for (const clusterId of clusterNodeById.keys()) {
      visibleClusterIds.add(clusterId);
    }
  }

  const visibleComments = commentNodes.filter((node) => !shouldFocusHighlights || highlightedNodeIds.has(node.id));

  const visibleClusterNodes = [...clusterNodeById.values()].filter((node) => visibleClusterIds.has(node.id));
  const anchorByClusterId = buildClusterAnchorMap(visibleClusterNodes, groupBy, mapDensity);

  for (const clusterNode of visibleClusterNodes) {
    const anchor = anchorByClusterId.get(clusterNode.id);
    if (!anchor) continue;

    clusterNode.anchorX = anchor.x;
    clusterNode.anchorY = anchor.y;
    if (!Number.isFinite(clusterNode.x) || !Number.isFinite(clusterNode.y)) {
      clusterNode.x = anchor.x;
      clusterNode.y = anchor.y;
      clusterNode.vx = 0;
      clusterNode.vy = 0;
    }
  }

  const visibleTrackNodes = [...trackNodeById.values()].filter((node) => visibleTrackNodeIds.has(node.id));
  for (const trackNode of visibleTrackNodes) {
    const clusterIds = clusterIdsByTrackId.get(trackNode.id) ?? [];
    const homeClusterId = clusterIds.find((clusterId) => visibleClusterIds.has(clusterId)) ?? null;
    trackNode.primaryClusterId = homeClusterId;

    const homeAnchor = homeClusterId ? anchorByClusterId.get(homeClusterId) : null;
    if (!homeAnchor) continue;

    trackNode.anchorX = homeAnchor.x;
    trackNode.anchorY = homeAnchor.y;
    if (!Number.isFinite(trackNode.x) || !Number.isFinite(trackNode.y)) {
      const seed = hash32(trackNode.id);
      const jitterAngle = (seed % 6283) / 1000;
      const jitterRadius = 24 + (seed % 36);
      trackNode.x = homeAnchor.x + Math.cos(jitterAngle) * jitterRadius;
      trackNode.y = homeAnchor.y + Math.sin(jitterAngle) * jitterRadius;
      trackNode.vx = 0;
      trackNode.vy = 0;
    }
  }

  const nodes = [...visibleClusterNodes, ...visibleTrackNodes, ...visibleComments];

  const filteredHighlights = [...highlightedNodeIds].filter((id) =>
    nodes.some((node) => node.id === id)
  );

  return {
    nodes,
    links: visibleLinks,
    stats: {
      scopedTracks: tracks.length,
      sampledTracks: tracks.length,
      visibleTracks: [...visibleTrackNodeIds].length,
      clusters: [...clusterNodeById.values()].length,
      visibleClusters: [...visibleClusterIds].length,
      highlights: filteredHighlights.length
    }
  };
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);

      setSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }
        return { width: nextWidth, height: nextHeight };
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export default function GraphNodes() {
  const collection = useExploreStore((state) => state.collection);
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const graphNodes = useExploreStore((state) => state.graphNodes);
  const setGraphNodes = useExploreStore((state) => state.setGraphNodes);

  const [highlightedNodeIds, setHighlightedNodeIds] = useState(() => new Set());
  const [collapsedClusterIds, setCollapsedClusterIds] = useState(() => new Set());
  const [commentNodes, setCommentNodes] = useState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const hoverTimerRef = useRef(null);
  const hoverCandidateRef = useRef(null);
  const viewportUpdateRafRef = useRef(null);
  const hoverAnimationRafRef = useRef(null);
  const coverAnimationRafRef = useRef(null);
  const clusterLabelOpacityRafRef = useRef(null);
  const hoverTargetNodeIdRef = useRef(null);
  const hoverStrengthByIdRef = useRef(new Map());
  const coverModeProgressRef = useRef(0);
  const clusterLabelBaseOpacityRef = useRef(0);
  const size = useElementSize(containerRef);
  const [visibleNodeCount, setVisibleNodeCount] = useState(Infinity);
  const [visibleClusterCount, setVisibleClusterCount] = useState(Infinity);
  const [visibleTrackCount, setVisibleTrackCount] = useState(Infinity);

  const tracks = useMemo(
    () => getTracksForScope(collection, selectedPlaylistIds),
    [collection, selectedPlaylistIds]
  );

  const indexes = useMemo(() => buildIndexes(collection), [collection]);

  useEffect(() => {
    setCollapsedClusterIds(new Set());
    setHighlightedNodeIds((current) => {
      const next = new Set();
      for (const id of current) {
        if (id.startsWith(TRACK_PREFIX) || id.startsWith(COMMENT_PREFIX)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [graphNodes.groupBy]);

  const graphData = useMemo(
    () =>
      buildGraphData({
        tracks,
        commentNodes,
        groupBy: graphNodes.groupBy,
        mapDensity: graphNodes.mapDensity,
        focusHighlights: graphNodes.focusHighlights,
        highlightedNodeIds,
        collapsedClusterIds,
        indexes
      }),
    [
      tracks,
      commentNodes,
      graphNodes.groupBy,
      graphNodes.mapDensity,
      graphNodes.focusHighlights,
      highlightedNodeIds,
      collapsedClusterIds,
      indexes
    ]
  );

  const clusterNodeIds = useMemo(
    () => graphData.nodes.filter((node) => node.type === 'cluster').map((node) => node.id),
    [graphData.nodes]
  );
  const trackIdsByClusterId = useMemo(() => {
    const map = new Map();
    for (const link of graphData.links) {
      if (!link.sourceId?.startsWith(CLUSTER_PREFIX)) continue;
      if (!link.targetId?.startsWith(TRACK_PREFIX)) continue;
      const bucket = map.get(link.sourceId) ?? new Set();
      bucket.add(link.targetId);
      map.set(link.sourceId, bucket);
    }
    return map;
  }, [graphData.links]);
  const hoveredClusterChildTrackIds = useMemo(() => {
    if (!hoveredNodeId?.startsWith(CLUSTER_PREFIX)) return null;
    return trackIdsByClusterId.get(hoveredNodeId) ?? null;
  }, [hoveredNodeId, trackIdsByClusterId]);

  useEffect(() => {
    if (!fgRef.current) return;

    const profile = getLayoutProfile(graphNodes.groupBy);
    const spacingScale = getSpacingScale(graphNodes.mapDensity);
    fgRef.current.d3Force('center', null);
    const charge = fgRef.current.d3Force('charge');
    const link = fgRef.current.d3Force('link');
    const collide = forceCollide((node) =>
      node.type === 'cluster' ? profile.clusterCollide * spacingScale : profile.trackCollide * spacingScale
    )
      .strength(0.9)
      .iterations(2);
    fgRef.current.d3Force('collide', collide);
    fgRef.current.d3Force(
      'cluster-x',
      forceX((node) => {
        if (node.type === 'cluster') return Number.isFinite(node.anchorX) ? node.anchorX : 0;
        if (node.type === 'track' && Number.isFinite(node.anchorX)) return node.anchorX;
        return 0;
      }).strength((node) => {
        if (node.type === 'cluster') return profile.clusterPull;
        if (node.type === 'track' && Number.isFinite(node.anchorX)) return profile.trackPull;
        return 0.01;
      })
    );
    fgRef.current.d3Force(
      'cluster-y',
      forceY((node) => {
        if (node.type === 'cluster') return Number.isFinite(node.anchorY) ? node.anchorY : 0;
        if (node.type === 'track' && Number.isFinite(node.anchorY)) return node.anchorY;
        return 0;
      }).strength((node) => {
        if (node.type === 'cluster') return profile.clusterPull;
        if (node.type === 'track' && Number.isFinite(node.anchorY)) return profile.trackPull;
        return 0.01;
      })
    );

    if (charge) {
      charge.strength(profile.chargeBase + profile.chargeScale * spacingScale);
    }

    if (link) {
      link.distance(profile.linkDistance * spacingScale);
      link.strength(profile.linkStrength);
    }

    if (fgRef.current.d3ReheatSimulation) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphNodes.groupBy, graphNodes.mapDensity, graphData.links.length, graphData.nodes.length]);

  useEffect(() => {
    if (!graphNodes.collapseAllClusters) return;
    setCollapsedClusterIds((current) => {
      const next = new Set(clusterNodeIds);
      return setsAreEqual(current, next) ? current : next;
    });
  }, [clusterNodeIds, graphNodes.collapseAllClusters]);

  useEffect(() => {
    if (!graphNodes.expandAllTick) return;
    setCollapsedClusterIds((current) => (current.size === 0 ? current : new Set()));
  }, [graphNodes.expandAllTick]);

  const labelsThresholdValue = Number.isFinite(graphNodes.labelsThreshold) ? graphNodes.labelsThreshold : 50;
  const visibilityThresholds = useMemo(
    () => getVisibilityThresholds(labelsThresholdValue),
    [labelsThresholdValue]
  );
  const shouldShowClusterLabelsByCount = visibleClusterCount <= visibilityThresholds.labelClusterThreshold;
  const shouldShowTrackCovers = visibleTrackCount < visibilityThresholds.coverTrackThreshold;

  const getTrackCoverUrl = useCallback(
    (trackId) => `https://picsum.photos/seed/tangle-track-${trackId}/128`,
    []
  );

  const ensureTrackImage = useCallback(
    (trackId) => {
      const cache = imageCacheRef.current;
      const key = String(trackId);
      const existing = cache.get(key);
      if (existing) return existing;

      const image = new Image();
      image.crossOrigin = 'anonymous';
      const entry = { status: 'loading', image: null };
      cache.set(key, entry);

      image.onload = () => {
        entry.status = 'loaded';
        entry.image = image;
        if (fgRef.current?.resumeAnimation) fgRef.current.resumeAnimation();
      };
      image.onerror = () => {
        entry.status = 'error';
      };

      image.src = getTrackCoverUrl(trackId);
      return entry;
    },
    [getTrackCoverUrl]
  );

  const countVisibleNodes = useCallback(() => {
    if (!fgRef.current || size.width <= 0 || size.height <= 0) {
      return {
        nodes: graphData.nodes.length,
        clusters: graphData.nodes.filter((node) => node.type === 'cluster').length,
        tracks: graphData.nodes.filter((node) => node.type === 'track').length
      };
    }

    const topLeft = fgRef.current.screen2GraphCoords(0, 0);
    const bottomRight = fgRef.current.screen2GraphCoords(size.width, size.height);
    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);

    let count = 0;
    let clusterCount = 0;
    let trackCount = 0;
    for (const node of graphData.nodes) {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
      if (node.x < minX || node.x > maxX || node.y < minY || node.y > maxY) continue;
      count += 1;
      if (node.type === 'cluster') clusterCount += 1;
      if (node.type === 'track') trackCount += 1;
    }
    return { nodes: count, clusters: clusterCount, tracks: trackCount };
  }, [graphData.nodes, size.height, size.width]);

  const updateVisibleNodeCount = useCallback(() => {
    const next = countVisibleNodes();
    setVisibleNodeCount((current) => (current === next.nodes ? current : next.nodes));
    setVisibleClusterCount((current) => (current === next.clusters ? current : next.clusters));
    setVisibleTrackCount((current) => (current === next.tracks ? current : next.tracks));
  }, [countVisibleNodes]);

  const scheduleVisibleNodeCountUpdate = useCallback(() => {
    if (viewportUpdateRafRef.current) return;
    viewportUpdateRafRef.current = window.requestAnimationFrame(() => {
      viewportUpdateRafRef.current = null;
      updateVisibleNodeCount();
    });
  }, [updateVisibleNodeCount]);

  const getNodeScreenSize = useCallback((sizeConfig, globalScale) => {
    const scaled = sizeConfig.base * globalScale;
    return clamp(scaled, sizeConfig.min, sizeConfig.max);
  }, []);

  const fitGraphView = useCallback(
    (durationMs = 450) => {
      if (!fgRef.current) return;
      if (size.width <= 0 || size.height <= 0) return;
      if (!graphData.nodes.length) return;

      fgRef.current.zoomToFit(durationMs, 48);
      updateVisibleNodeCount();
    },
    [graphData.nodes.length, size.height, size.width, updateVisibleNodeCount]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fitGraphView(450);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [fitGraphView, graphNodes.groupBy]);

  useEffect(() => {
    if (!graphNodes.resetViewTick) return;
    const timer = window.setTimeout(() => {
      fitGraphView(420);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [fitGraphView, graphNodes.resetViewTick]);

  useEffect(() => {
    updateVisibleNodeCount();
  }, [updateVisibleNodeCount]);

  const animateHoverStrength = useCallback(() => {
    const strengths = hoverStrengthByIdRef.current;
    const activeId = hoverTargetNodeIdRef.current;
    const idsToAnimate = new Set(strengths.keys());
    if (activeId) idsToAnimate.add(activeId);

    let changed = false;
    for (const nodeId of idsToAnimate) {
      const current = strengths.get(nodeId) ?? 0;
      const target = nodeId === activeId ? 1 : 0;
      const next = lerp(current, target, 0.26);

      if (Math.abs(next - target) > 0.01) {
        strengths.set(nodeId, next);
        changed = true;
      } else if (target === 0) {
        if (strengths.delete(nodeId)) changed = true;
      } else if (current !== 1) {
        strengths.set(nodeId, 1);
        changed = true;
      }
    }

    if (changed && fgRef.current?.resumeAnimation) {
      fgRef.current.resumeAnimation();
    }

    if (changed || activeId || strengths.size > 0) {
      hoverAnimationRafRef.current = window.requestAnimationFrame(animateHoverStrength);
    } else {
      hoverAnimationRafRef.current = null;
    }
  }, []);

  const setHoverTargetNodeId = useCallback(
    (nextId) => {
      hoverTargetNodeIdRef.current = nextId;
      if (!hoverAnimationRafRef.current) {
        hoverAnimationRafRef.current = window.requestAnimationFrame(animateHoverStrength);
      }
    },
    [animateHoverStrength]
  );

  useEffect(() => {
    if (coverAnimationRafRef.current) {
      window.cancelAnimationFrame(coverAnimationRafRef.current);
      coverAnimationRafRef.current = null;
    }

    const animate = () => {
      const targetCoverProgress = shouldShowTrackCovers ? 1 : 0;
      const currentCoverProgress = coverModeProgressRef.current;
      const nextCoverProgress = lerp(currentCoverProgress, targetCoverProgress, COVER_TRANSITION_EASING);
      const needsNextFrame = Math.abs(nextCoverProgress - targetCoverProgress) > 0.005;

      coverModeProgressRef.current = needsNextFrame ? nextCoverProgress : targetCoverProgress;
      if (fgRef.current?.resumeAnimation) fgRef.current.resumeAnimation();

      if (needsNextFrame) {
        coverAnimationRafRef.current = window.requestAnimationFrame(animate);
      } else {
        coverAnimationRafRef.current = null;
      }
    };

    coverAnimationRafRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (coverAnimationRafRef.current) {
        window.cancelAnimationFrame(coverAnimationRafRef.current);
        coverAnimationRafRef.current = null;
      }
    };
  }, [shouldShowTrackCovers]);

  useEffect(() => {
    if (clusterLabelOpacityRafRef.current) {
      window.cancelAnimationFrame(clusterLabelOpacityRafRef.current);
      clusterLabelOpacityRafRef.current = null;
    }

    const targetOpacity = shouldShowClusterLabelsByCount ? CLUSTER_LABEL_BASE_OPACITY : 0;
    const animate = () => {
      const currentOpacity = clusterLabelBaseOpacityRef.current;
      const nextOpacity = lerp(currentOpacity, targetOpacity, 0.24);
      const shouldContinue = Math.abs(nextOpacity - targetOpacity) > 0.01;

      clusterLabelBaseOpacityRef.current = shouldContinue ? nextOpacity : targetOpacity;
      if (fgRef.current?.resumeAnimation) fgRef.current.resumeAnimation();

      if (shouldContinue) {
        clusterLabelOpacityRafRef.current = window.requestAnimationFrame(animate);
      } else {
        clusterLabelOpacityRafRef.current = null;
      }
    };

    clusterLabelOpacityRafRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (clusterLabelOpacityRafRef.current) {
        window.cancelAnimationFrame(clusterLabelOpacityRafRef.current);
        clusterLabelOpacityRafRef.current = null;
      }
    };
  }, [shouldShowClusterLabelsByCount]);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
      if (viewportUpdateRafRef.current) {
        window.cancelAnimationFrame(viewportUpdateRafRef.current);
      }
      if (hoverAnimationRafRef.current) {
        window.cancelAnimationFrame(hoverAnimationRafRef.current);
      }
      if (coverAnimationRafRef.current) {
        window.cancelAnimationFrame(coverAnimationRafRef.current);
      }
      if (clusterLabelOpacityRafRef.current) {
        window.cancelAnimationFrame(clusterLabelOpacityRafRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!shouldShowTrackCovers) return;
    if (!fgRef.current || size.width <= 0 || size.height <= 0) return;

    const topLeft = fgRef.current.screen2GraphCoords(0, 0);
    const bottomRight = fgRef.current.screen2GraphCoords(size.width, size.height);
    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);

    let prefetched = 0;
    for (const node of graphData.nodes) {
      if (prefetched >= 80) break;
      if (node.type !== 'track') continue;
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
      if (node.x < minX || node.x > maxX || node.y < minY || node.y > maxY) continue;
      ensureTrackImage(node.trackId);
      prefetched += 1;
    }
  }, [ensureTrackImage, graphData.nodes, shouldShowTrackCovers, size.height, size.width]);

  const hoveredNode = useMemo(
    () => graphData.nodes.find((node) => node.id === hoveredNodeId) ?? null,
    [graphData.nodes, hoveredNodeId]
  );

  useEffect(() => {
    if (!hoveredNodeId) return;
    if (hoveredNode) return;
    setHoverTargetNodeId(null);
    setHoveredNodeId(null);
  }, [hoveredNode, hoveredNodeId, setHoverTargetNodeId]);

  const hoveredTrackPopover = useMemo(() => {
    if (!hoveredNode || hoveredNode.type !== 'track') return null;
    if (!fgRef.current || !Number.isFinite(hoveredNode.x) || !Number.isFinite(hoveredNode.y)) return null;

    const screen = fgRef.current.graph2ScreenCoords(hoveredNode.x, hoveredNode.y);
    const cardWidth = 280;
    const cardHeight = 250;
    const margin = 14;
    const unclampedLeft = screen.x + 18;
    const unclampedTop = screen.y - cardHeight * 0.62;
    const left = clamp(unclampedLeft, margin, Math.max(margin, size.width - cardWidth - margin));
    const top = clamp(unclampedTop, margin, Math.max(margin, size.height - cardHeight - margin));

    return {
      left,
      top,
      track: hoveredNode
    };
  }, [hoveredNode, size.height, size.width]);

  function toggleHighlight(nodeId) {
    setHighlightedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function onAddComment() {
    const text = window.prompt('Comment node text');
    if (!text || !text.trim()) return;

    const id = `${COMMENT_PREFIX}${Date.now()}:${commentNodes.length + 1}`;
    const seed = hash32(id);
    const x = (seed % 320) - 160;
    const y = ((seed >> 9) % 280) - 140;

    const node = {
      id,
      type: 'comment',
      label: text.trim(),
      x,
      y,
      fx: x,
      fy: y
    };

    setCommentNodes((current) => [...current, node]);
    setHighlightedNodeIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  function onClearHighlights() {
    setHighlightedNodeIds(new Set());
    setGraphNodes({ focusHighlights: false });
  }

  function onCreatePlaylistFromHighlights() {
    const highlightedTrackIds = [...highlightedNodeIds]
      .filter((id) => id.startsWith(TRACK_PREFIX))
      .map((id) => Number(id.slice(TRACK_PREFIX.length)))
      .filter(Number.isFinite);

    if (!highlightedTrackIds.length) {
      window.alert('Highlight some track nodes first.');
      return;
    }

    const preview = highlightedTrackIds.slice(0, 12).join(', ');
    const overflow = highlightedTrackIds.length > 12 ? ` +${highlightedTrackIds.length - 12} more` : '';
    window.alert(
      `Prototype action: create playlist from ${highlightedTrackIds.length} tracks.\nTrack IDs: ${preview}${overflow}`
    );
  }

  function onNodeRightClick(node, event) {
    event.preventDefault();
    toggleHighlight(node.id);
  }

  function onNodeDoubleClick(node) {
    if (node.type !== 'cluster') return;
    if (graphNodes.collapseAllClusters) return;

    setCollapsedClusterIds((current) => {
      const next = new Set(current);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }

  function onNodeClick(node) {
    if (node.type !== 'cluster') return;
    if (!collapsedClusterIds.has(node.id)) return;

    if (graphNodes.collapseAllClusters) {
      setGraphNodes({ collapseAllClusters: false });
    }

    setCollapsedClusterIds((current) => {
      if (!current.has(node.id)) return current;
      const next = new Set(current);
      next.delete(node.id);
      return next;
    });
  }

  function onNodeHover(node) {
    const nextId = node?.id ?? null;
    if (nextId === hoverCandidateRef.current) return;
    hoverCandidateRef.current = nextId;

    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (!nextId) {
      hoverTimerRef.current = window.setTimeout(() => {
        if (hoverCandidateRef.current !== null) return;
        setHoverTargetNodeId(null);
        setHoveredNodeId(null);
      }, HOVER_EXIT_MS);
      return;
    }

    hoverTimerRef.current = window.setTimeout(() => {
      if (hoverCandidateRef.current === nextId) {
        setHoverTargetNodeId(nextId);
        setHoveredNodeId(nextId);
      }
    }, HOVER_DELAY_MS);
  }

  function drawNode(node, ctx, globalScale) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const isHighlighted = highlightedNodeIds.has(node.id);
    const hoverStrength = hoverStrengthByIdRef.current.get(node.id) ?? 0;

    if (node.type === 'comment') {
      const text = node.label || 'Comment';
      const width = Math.max(84, text.length * 6.5);
      const height = 24;
      const x = node.x - width / 2;
      const y = node.y - height / 2;

      roundRect(ctx, x, y, width, height, 6);
      ctx.fillStyle = isHighlighted ? CLUSTER_COLOR : '#2B465F';
      ctx.fill();
      ctx.strokeStyle = isHighlighted ? '#AB3DFF' : TRACK_COLOR;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${11 / globalScale}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, node.x, node.y + 0.5);
      return;
    }

    const isCluster = node.type === 'cluster';
    const isCollapsed = isCluster && collapsedClusterIds.has(node.id);
    const coverProgress = coverModeProgressRef.current;
    const clusterSizePx = getNodeScreenSize(CLUSTER_NODE_SIZE_PX, globalScale);
    const childSizePx = getNodeScreenSize(TRACK_NODE_SIZE_PX, globalScale);
    const coverSizePx = getNodeScreenSize(COVER_NODE_SIZE_PX, globalScale);
    const targetSizePx = isCluster ? clusterSizePx : lerp(childSizePx, coverSizePx, coverProgress);
    const screenSize = targetSizePx;
    const nodeSize = screenSize / globalScale;
    const radius = nodeSize / 2;
    const activeHoveredClusterId = hoveredNodeId?.startsWith(CLUSTER_PREFIX) ? hoveredNodeId : null;
    const hoveredClusterStrength = activeHoveredClusterId
      ? hoverStrengthByIdRef.current.get(activeHoveredClusterId) ?? 0
      : 0;
    const activeHoveredNodeStrength = hoveredNodeId ? hoverStrengthByIdRef.current.get(hoveredNodeId) ?? 0 : 0;
    const isDirectChildOfHoveredCluster = !isCluster && hoveredClusterChildTrackIds?.has(node.id);
    const directChildHighlightStrength = isDirectChildOfHoveredCluster ? hoveredClusterStrength : 0;
    const childHighlightStrength = Math.max(hoverStrength, directChildHighlightStrength);
    const childDimStrength = isCluster ? 0 : activeHoveredNodeStrength * (1 - childHighlightStrength);
    const dimmedTrackR = Math.round(lerp(22, 7, childDimStrength));
    const dimmedTrackG = Math.round(lerp(49, 27, childDimStrength));
    const dimmedTrackB = Math.round(lerp(74, 46, childDimStrength));
    const trackFillR = Math.round(lerp(dimmedTrackR, 255, directChildHighlightStrength));
    const trackFillG = Math.round(lerp(dimmedTrackG, 255, directChildHighlightStrength));
    const trackFillB = Math.round(lerp(dimmedTrackB, 255, directChildHighlightStrength));
    const trackFillColor = `rgb(${trackFillR}, ${trackFillG}, ${trackFillB})`;

    if (!isCluster && coverProgress > 0.02) {
      const half = nodeSize / 2;
      const x = node.x - half;
      const y = node.y - half;
      const imageEntry = ensureTrackImage(node.trackId);

      roundRect(ctx, x, y, nodeSize, nodeSize, Math.max(1.2, nodeSize * 0.12));
      ctx.fillStyle = trackFillColor;
      ctx.fill();

      if (imageEntry.status === 'loaded' && imageEntry.image) {
        ctx.save();
        roundRect(ctx, x, y, nodeSize, nodeSize, Math.max(1.2, nodeSize * 0.12));
        ctx.clip();
        ctx.drawImage(imageEntry.image, x, y, nodeSize, nodeSize);
        if (childDimStrength > 0.001) {
          ctx.fillStyle = `rgba(7, 27, 46, ${0.48 * childDimStrength})`;
          ctx.fillRect(x, y, nodeSize, nodeSize);
        }
        if (directChildHighlightStrength > 0.001) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.34 * directChildHighlightStrength})`;
          ctx.fillRect(x, y, nodeSize, nodeSize);
        }
        ctx.restore();
      }

      roundRect(ctx, x, y, nodeSize, nodeSize, Math.max(1.2, nodeSize * 0.12));
      if (hoverStrength > 0.001) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * hoverStrength})`;
        ctx.lineWidth = (8 * hoverStrength) / globalScale;
        ctx.stroke();
      }
      return;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    if (isCluster) {
      const parentOpacity = lerp(0.88, 1, hoverStrength);
      ctx.fillStyle = `rgba(171, 61, 255, ${parentOpacity})`;
    } else {
      ctx.fillStyle = trackFillColor;
    }
    ctx.fill();

    if (hoverStrength > 0.001) {
      const hoverColor = isCluster ? `rgba(171, 61, 255, ${0.5 * hoverStrength})` : `rgba(255, 255, 255, ${0.5 * hoverStrength})`;
      ctx.strokeStyle = hoverColor;
      ctx.lineWidth = (8 * hoverStrength) / globalScale;
      ctx.stroke();
    }

    if (isCluster && isCollapsed) {
      ctx.beginPath();
      ctx.moveTo(node.x - radius * 0.33, node.y);
      ctx.lineTo(node.x + radius * 0.33, node.y);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }

  }

  function drawClusterLabels(ctx, globalScale) {
    const clusterSizePx = getNodeScreenSize(CLUSTER_NODE_SIZE_PX, globalScale);
    const radius = (clusterSizePx / globalScale) / 2;
    const parentLabelSize = 40 / globalScale;
    const baseOpacity = clusterLabelBaseOpacityRef.current;
    const activeHoveredClusterId = hoveredNodeId?.startsWith(CLUSTER_PREFIX) ? hoveredNodeId : null;
    const hoveredClusterStrength = activeHoveredClusterId
      ? hoverStrengthByIdRef.current.get(activeHoveredClusterId) ?? 0
      : 0;

    ctx.font = `600 ${parentLabelSize}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const node of graphData.nodes) {
      if (node.type !== 'cluster') continue;
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;

      const hoverStrength = hoverStrengthByIdRef.current.get(node.id) ?? 0;
      const contextualBaseOpacity =
        activeHoveredClusterId && node.id !== activeHoveredClusterId
          ? lerp(baseOpacity, 0.15, hoveredClusterStrength)
          : baseOpacity;
      const labelOpacity = lerp(contextualBaseOpacity, 1, hoverStrength);
      if (labelOpacity <= 0.001) continue;

      ctx.fillStyle = `rgba(171, 61, 255, ${labelOpacity})`;
      ctx.fillText(String(node.label).toUpperCase(), node.x, node.y + radius + 8 / globalScale);
    }
  }

  function drawNodePointerArea(node, color, ctx) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const currentScale = fgRef.current?.zoom() || 1;
    if (node.type === 'comment') {
      const text = node.label || 'Comment';
      const width = Math.max(84, text.length * 6.5);
      const height = 24;
      const x = node.x - width / 2;
      const y = node.y - height / 2;

      roundRect(ctx, x, y, width, height, 6);
      ctx.fillStyle = color;
      ctx.fill();
      return;
    }

    const coverProgress = coverModeProgressRef.current;
    const clusterSizePx = getNodeScreenSize(CLUSTER_NODE_SIZE_PX, currentScale);
    const childSizePx = getNodeScreenSize(TRACK_NODE_SIZE_PX, currentScale);
    const coverSizePx = getNodeScreenSize(COVER_NODE_SIZE_PX, currentScale);
    const screenSize = node.type === 'cluster' ? clusterSizePx : lerp(childSizePx, coverSizePx, coverProgress);
    const nodeSize = screenSize / currentScale;

    if (node.type === 'track' && coverProgress > 0.02) {
      const half = nodeSize / 2;
      roundRect(ctx, node.x - half, node.y - half, half * 2, half * 2, 1.2);
      ctx.fillStyle = color;
      ctx.fill();
      return;
    }

    const radius = nodeSize / 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawGrid(ctx, globalScale) {
    if (!fgRef.current || size.width <= 0 || size.height <= 0) return;

    const topLeft = fgRef.current.screen2GraphCoords(0, 0);
    const bottomRight = fgRef.current.screen2GraphCoords(size.width, size.height);
    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);

    let spacing = GRID_BASE_SPACING;
    if (globalScale * spacing < GRID_MIN_SCREEN_SPACING) {
      const requiredSpacing = GRID_MIN_SCREEN_SPACING / Math.max(globalScale, 0.0001);
      const multiplier = 2 ** Math.ceil(Math.log2(requiredSpacing / GRID_BASE_SPACING));
      spacing = GRID_BASE_SPACING * Math.max(1, multiplier);
    }

    const dotSize = GRID_DOT_SCREEN_SIZE / Math.max(globalScale, 0.0001);
    const halfDot = dotSize / 2;
    const startX = Math.floor(minX / spacing) * spacing;
    const endX = Math.ceil(maxX / spacing) * spacing;
    const startY = Math.floor(minY / spacing) * spacing;
    const endY = Math.ceil(maxY / spacing) * spacing;

    ctx.fillStyle = 'rgba(67, 93, 119, 0.34)';
    for (let x = startX; x <= endX; x += spacing) {
      for (let y = startY; y <= endY; y += spacing) {
        ctx.fillRect(x - halfDot, y - halfDot, dotSize, dotSize);
      }
    }
  }

  const summary = graphData.stats;

  return (
    <section className={styles.root}>
      <div className={styles.overlayTop}>
        <div className={styles.metrics}>
          <div className={styles.metricLabel}>Scoped</div>
          <div>{summary.scopedTracks} tracks</div>
          <div className={styles.metricLabel}>Rendered</div>
          <div>{summary.visibleTracks} tracks</div>
          <div className={styles.metricLabel}>Clusters</div>
          <div>{summary.visibleClusters}</div>
          <div className={styles.metricLabel}>Highlights</div>
          <div>{summary.highlights}</div>
          <div className={styles.metricLabel}>In View</div>
          <div>{Number.isFinite(visibleNodeCount) ? visibleNodeCount : '-'}</div>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setGraphNodes({ focusHighlights: !graphNodes.focusHighlights })}>
            {graphNodes.focusHighlights ? 'Show All' : 'Focus Highlights'}
          </button>
          <button type="button" onClick={onClearHighlights}>Clear Highlights</button>
          <button type="button" onClick={onCreatePlaylistFromHighlights}>Create Playlist From Highlights</button>
        </div>
      </div>

      <div ref={containerRef} className={styles.canvas}>
        {size.width > 0 && size.height > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor="#020E19"
            linkColor={(link) => {
              const sourceStrength = hoverStrengthByIdRef.current.get(link.sourceId) ?? 0;
              const targetStrength = hoverStrengthByIdRef.current.get(link.targetId) ?? 0;
              const strength = Math.max(sourceStrength, targetStrength);
              const r = Math.round(lerp(22, 171, strength));
              const g = Math.round(lerp(49, 61, strength));
              const b = Math.round(lerp(74, 255, strength));
              return `rgba(${r}, ${g}, ${b}, 0.5)`;
            }}
            linkWidth={(link) => {
              const sourceStrength = hoverStrengthByIdRef.current.get(link.sourceId) ?? 0;
              const targetStrength = hoverStrengthByIdRef.current.get(link.targetId) ?? 0;
              const strength = Math.max(sourceStrength, targetStrength);
              const base = highlightedNodeIds.has(link.targetId) ? 1.4 : 0.7;
              return lerp(base, 2, strength);
            }}
            nodeRelSize={4}
            cooldownTicks={110}
            autoPauseRedraw={false}
            onRenderFramePre={drawGrid}
            nodeCanvasObject={drawNode}
            onRenderFramePost={drawClusterLabels}
            nodePointerAreaPaint={drawNodePointerArea}
            onNodeHover={onNodeHover}
            onNodeClick={onNodeClick}
            onNodeRightClick={onNodeRightClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onZoom={scheduleVisibleNodeCountUpdate}
            onZoomEnd={scheduleVisibleNodeCountUpdate}
            enableNodeDrag
          />
        ) : null}
      </div>

      {hoveredTrackPopover ? (
        <aside
          className={styles.trackPopover}
          style={{ left: `${hoveredTrackPopover.left}px`, top: `${hoveredTrackPopover.top}px` }}
        >
          <img
            className={styles.trackCover}
            src={getTrackCoverUrl(hoveredTrackPopover.track.trackId)}
            alt={hoveredTrackPopover.track.label}
          />
          <div className={styles.trackMeta}>
            <div className={styles.trackTitle}>{hoveredTrackPopover.track.label}</div>
            <div className={styles.trackArtist}>{hoveredTrackPopover.track.artistLabel}</div>
          </div>
          <div className={styles.trackSectionLabel}>Included In</div>
          <div className={styles.trackPlaylistList}>
            {(hoveredTrackPopover.track.playlistLabels || []).slice(0, 10).map((playlistName) => (
              <span key={playlistName} className={styles.trackPlaylistPill}>{playlistName}</span>
            ))}
            {!hoveredTrackPopover.track.playlistLabels?.length ? (
              <span className={styles.trackPlaylistPill}>No playlist</span>
            ) : null}
          </div>
        </aside>
      ) : null}

      <button type="button" className={styles.addComment} onClick={onAddComment}>
        + Comment Node
      </button>
    </section>
  );
}
