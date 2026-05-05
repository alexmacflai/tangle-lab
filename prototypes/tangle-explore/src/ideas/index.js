import { lazy } from 'react';

export const IDEAS = [
  {
    id: 'graph-nodes',
    label: 'Graph Nodes',
    component: lazy(() => import('./GraphNodes/GraphNodes')),
    controls: lazy(() => import('./GraphNodes/GraphNodesControls'))
  },
  {
    id: 'timeline',
    label: 'Timeline',
    component: lazy(() => import('./Timeline/Timeline')),
    controls: lazy(() => import('./Timeline/TimelineControls'))
  },
  {
    id: 'set-planner',
    label: 'Set Planner',
    component: lazy(() => import('./SetPlanner/SetPlanner')),
    controls: lazy(() => import('./SetPlanner/SetPlannerControls'))
  },
  {
    id: 'chromatic-wheel',
    label: 'Chromatic Wheel',
    component: lazy(() => import('./ChromaticWheel/ChromaticWheel')),
    controls: lazy(() => import('./ChromaticWheel/ChromaticWheelControls'))
  },
  {
    id: 'my-world',
    label: 'My World',
    component: lazy(() => import('./MyWorld/MyWorld')),
    controls: lazy(() => import('./MyWorld/MyWorldControls'))
  },
  {
    id: 'collection-comparator',
    label: 'Collection Comparator',
    component: lazy(() => import('./CollectionComparator/CollectionComparator')),
    controls: null
  },
  {
    id: 'ideation-canvas',
    label: 'Ideation Canvas',
    hideSidebar: true,
    component: lazy(() => import('./IdeationCanvas/IdeationCanvas')),
    controls: lazy(() => import('./IdeationCanvas/IdeationCanvasControls'))
  }
];

export function getIdeaById(ideaId) {
  return IDEAS.find((idea) => idea.id === ideaId) ?? null;
}
