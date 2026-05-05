import { create } from 'zustand';

const EMPTY_COLLECTION = {
  tracks: [],
  playlists: [],
  tags: [],
  artists: [],
  genres: [],
  trackTags: [],
  trackPlaylists: [],
  trackArtists: []
};

export const useExploreStore = create((set) => ({
  activeIdeaId: 'graph-nodes',
  setActiveIdea: (id) => set({ activeIdeaId: id }),

  selectedPlaylistIds: new Set(),
  setSelectedPlaylistIds: (ids) => set({ selectedPlaylistIds: new Set(ids) }),
  togglePlaylist: (id, modifier = 'none') =>
    set((state) => {
      const next = new Set(state.selectedPlaylistIds);

      if (modifier === 'cmd') {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return { selectedPlaylistIds: next };
      }

      return { selectedPlaylistIds: new Set([id]) };
    }),

  collection: null,
  collectionError: null,
  setCollection: (data) => set({ collection: data, collectionError: null }),
  setCollectionError: (message) => set({ collectionError: message, collection: EMPTY_COLLECTION }),

  graphNodes: {
    groupBy: 'playlist',
    mapDensity: 50,
    labelsThreshold: 50,
    focusHighlights: false,
    collapseAllClusters: false,
    expandAllTick: 0,
    resetViewTick: 0
  },
  setGraphNodes: (patch) =>
    set((state) => ({
      graphNodes: { ...state.graphNodes, ...patch }
    })),
  triggerGraphNodesResetView: () =>
    set((state) => ({
      graphNodes: {
        ...state.graphNodes,
        resetViewTick: state.graphNodes.resetViewTick + 1
      }
    })),
  triggerGraphNodesExpandAll: () =>
    set((state) => ({
      graphNodes: {
        ...state.graphNodes,
        expandAllTick: state.graphNodes.expandAllTick + 1
      }
    })),

  timeline: {
    viewMode: 'streamgraph',
    groupBy: 'genre',
    colorBy: 'genre'
  },
  setTimeline: (patch) =>
    set((state) => ({
      timeline: { ...state.timeline, ...patch }
    })),

  setPlanner: {
    showBpmLine: true,
    showKey: true,
    gapThreshold: 15
  },
  setSetPlanner: (patch) =>
    set((state) => ({
      setPlanner: { ...state.setPlanner, ...patch }
    })),

  chromaticWheel: {
    viewBy: 'tracks',
    showTrackNodes: false
  },
  setChromaticWheel: (patch) =>
    set((state) => ({
      chromaticWheel: { ...state.chromaticWheel, ...patch }
    })),

  myWorld: {
    renderMode: 'isometric',
    xAxis: 'bpm',
    yAxis: 'releaseYear',
    elevation: 'density',
    colorBy: 'genre',
    smoothing: 42,
    heightScale: 140,
    showLabels: true
  },
  setMyWorld: (patch) =>
    set((state) => ({
      myWorld: { ...state.myWorld, ...patch }
    })),

  ideationCanvas: {
    toolMode: 'move',
    clearSignal: 0,
    createPlaylistSignal: 0
  },
  setIdeationCanvas: (patch) =>
    set((state) => ({
      ideationCanvas: { ...state.ideationCanvas, ...patch }
    })),
  triggerIdeationCanvasClear: () =>
    set((state) => ({
      ideationCanvas: {
        ...state.ideationCanvas,
        clearSignal: state.ideationCanvas.clearSignal + 1
      }
    })),
  triggerIdeationCanvasCreatePlaylist: () =>
    set((state) => ({
      ideationCanvas: {
        ...state.ideationCanvas,
        createPlaylistSignal: state.ideationCanvas.createPlaylistSignal + 1
      }
    }))
}));

export { EMPTY_COLLECTION };
