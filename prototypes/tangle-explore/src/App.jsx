import React, { Suspense, useMemo } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCollection } from './data/useCollection';
import { useExploreStore } from './store/useExploreStore';
import { IDEAS, getIdeaById } from './ideas';
import { IdeaRenderer } from './ideas/IdeaRenderer';
import { Sidebar } from './shell/Sidebar/Sidebar';
import { BottomBar } from './shell/BottomBar/BottomBar';
import { ErrorBoundary } from './shell/ErrorBoundary';
import styles from './App.module.css';

const VinylStickersApp = React.lazy(() =>
  import('../../vinyl-stickers/src/App').then((module) => ({ default: module.VinylStickersApp }))
);

const PROTOTYPE_ENTRIES = [
  {
    id: 'tangle-explore',
    label: 'tangle-explore',
    description: 'Idea playground for collection exploration and interaction experiments.',
    href: '#/tangle-explore',
    kind: 'Internal'
  },
  {
    id: 'vinyl-stickers',
    label: 'vinyl-stickers',
    description: 'Vinyl collection prototype with animated sleeve, disc, and sticker interactions.',
    href: '#/vinyl-stickers',
    kind: 'Internal'
  }
];

function PrototypeIndexRoute() {
  return (
    <div className={styles.indexPage}>
      <div className={styles.indexShell}>
        <div className={styles.indexHeader}>
          <p className={styles.kicker}>Tangle Lab</p>
          <h1 className={styles.indexTitle}>Prototype Index</h1>
          <p className={styles.indexIntro}>
            Run <code>npm run dev</code> in tangle-lab, then open a prototype destination.
          </p>
        </div>
        <div className={styles.indexGrid}>
          {PROTOTYPE_ENTRIES.map((entry) => (
            <a key={entry.id} href={entry.href} className={styles.indexCard}>
              <div>
                <span className={styles.indexCardLabel}>{entry.label}</span>
                <p className={styles.indexCardDescription}>{entry.description}</p>
              </div>
              <span className={styles.indexCardMeta}>{entry.kind} prototype</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function TangleExploreIndexRoute() {
  return (
    <div className={styles.indexPage}>
      <div className={styles.indexShell}>
        <div className={styles.indexHeader}>
          <p className={styles.kicker}>tangle-explore</p>
          <h1 className={styles.indexTitle}>Subprototype Index</h1>
          <p className={styles.indexIntro}>Choose a subprototype to open that specific experiment.</p>
        </div>
        <div className={styles.indexGrid}>
          {IDEAS.map((idea) => (
            <Link key={idea.id} to={`/tangle-explore/${idea.id}`} className={styles.indexCard}>
              <span className={styles.indexCardLabel}>{idea.label}</span>
              <span className={styles.indexCardMeta}>Open subprototype</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function VinylStickersRoute() {
  const location = useLocation();
  const initialMode = location.pathname.endsWith('/components') ? 'components' : 'default';

  return (
    <Suspense fallback={<div className={styles.loading}>Loading vinyl-stickers...</div>}>
      <VinylStickersApp initialMode={initialMode} />
    </Suspense>
  );
}

function ExploreRoute() {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const setActiveIdea = useExploreStore((state) => state.setActiveIdea);
  const collection = useExploreStore((state) => state.collection);
  const collectionError = useExploreStore((state) => state.collectionError);

  const activeIdea = useMemo(() => getIdeaById(ideaId), [ideaId]);

  React.useEffect(() => {
    if (!activeIdea) {
      navigate(`/tangle-explore/${IDEAS[0].id}`, { replace: true });
      return;
    }
    setActiveIdea(activeIdea.id);
  }, [activeIdea, navigate, setActiveIdea]);

  const rootClassName = [styles.app, activeIdea?.hideSidebar ? styles.sidebarHidden : ''].join(' ').trim();

  return (
    <div className={rootClassName}>
      <div className={styles.sidebar}>
        <Sidebar collection={collection} />
      </div>
      <div className={styles.main}>
        {collectionError ? <div className={styles.error}>{collectionError}</div> : null}
        {!collection ? <div className={styles.loading}>Loading collection...</div> : null}
        {collection ? (
          <ErrorBoundary>
            <Suspense fallback={<div className={styles.loading}>Loading idea...</div>}>
              <IdeaRenderer idea={activeIdea} collection={collection} />
            </Suspense>
          </ErrorBoundary>
        ) : null}
        <BottomBar idea={activeIdea} />
      </div>
    </div>
  );
}

export default function App() {
  useCollection();

  return (
    <Routes>
      <Route path="/" element={<PrototypeIndexRoute />} />
      <Route path="/tangle-explore" element={<TangleExploreIndexRoute />} />
      <Route path="/tangle-explore/:ideaId" element={<ExploreRoute />} />
      <Route path="/vinyl-stickers/*" element={<VinylStickersRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
