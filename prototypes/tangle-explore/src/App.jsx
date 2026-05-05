import React, { Suspense, useMemo } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useCollection } from './data/useCollection';
import { useExploreStore } from './store/useExploreStore';
import { IDEAS, getIdeaById } from './ideas';
import { IdeaRenderer } from './ideas/IdeaRenderer';
import { Sidebar } from './shell/Sidebar/Sidebar';
import { BottomBar } from './shell/BottomBar/BottomBar';
import { ErrorBoundary } from './shell/ErrorBoundary';
import styles from './App.module.css';

function PrototypeIndexRoute() {
  return (
    <div className={styles.indexPage}>
      <div className={styles.indexShell}>
        <div className={styles.indexHeader}>
          <p className={styles.kicker}>Tangle Lab</p>
          <h1 className={styles.indexTitle}>Prototype Index</h1>
          <p className={styles.indexIntro}>
            Explore each prototype as its own destination. Pick one to enter the experience directly.
          </p>
        </div>
        <div className={styles.indexGrid}>
          {IDEAS.map((idea) => (
            <Link key={idea.id} to={`/explore/${idea.id}`} className={styles.indexCard}>
              <span className={styles.indexCardLabel}>{idea.label}</span>
              <span className={styles.indexCardMeta}>Open prototype</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
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
      navigate(`/explore/${IDEAS[0].id}`, { replace: true });
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
      <Route path="/explore/:ideaId" element={<ExploreRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
