import React from 'react';
import styles from './IdeaStub.module.css';

export function IdeaRenderer({ idea, collection }) {
  if (!idea) {
    return <div className={styles.state}>Unknown idea.</div>;
  }

  const Component = idea.component;
  return (
    <div className={styles.viewport}>
      <Component collection={collection} />
    </div>
  );
}
