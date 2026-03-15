import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './TopBar.module.css';

export function TopBar({ ideas, activeIdeaId }) {
  const navigate = useNavigate();
  const setActiveIdea = useExploreStore((state) => state.setActiveIdea);

  function onSelect(id) {
    setActiveIdea(id);
    navigate(`/explore/${id}`);
  }

  return (
    <div className={styles.root}>
      <div className={styles.scrollRow}>
        {ideas.map((idea) => {
          const isActive = idea.id === activeIdeaId;
          return (
            <button
              key={idea.id}
              type="button"
              className={[styles.chip, isActive ? styles.active : ''].join(' ').trim()}
              onClick={() => onSelect(idea.id)}
            >
              {idea.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
