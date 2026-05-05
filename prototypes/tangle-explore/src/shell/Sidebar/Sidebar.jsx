import React, { useMemo, useRef } from 'react';
import { LibraryBig } from 'lucide-react';
import { useExploreStore } from '../../store/useExploreStore';
import styles from './Sidebar.module.css';

export function Sidebar({ collection }) {
  const selectedPlaylistIds = useExploreStore((state) => state.selectedPlaylistIds);
  const setSelectedPlaylistIds = useExploreStore((state) => state.setSelectedPlaylistIds);
  const togglePlaylist = useExploreStore((state) => state.togglePlaylist);
  const lastClickedIndexRef = useRef(null);

  const playlists = useMemo(() => {
    if (!collection?.playlists) return [];
    return [...collection.playlists].sort((a, b) => b.track_count - a.track_count || a.playlist_id - b.playlist_id);
  }, [collection]);

  function clearSelection() {
    setSelectedPlaylistIds([]);
    lastClickedIndexRef.current = null;
  }

  function selectRange(index) {
    const last = lastClickedIndexRef.current;
    if (last === null) {
      setSelectedPlaylistIds([playlists[index].playlist_id]);
      return;
    }

    const [start, end] = last < index ? [last, index] : [index, last];
    const ids = playlists.slice(start, end + 1).map((playlist) => playlist.playlist_id);
    setSelectedPlaylistIds(ids);
  }

  function onPlaylistClick(event, playlistId, index) {
    if (event.shiftKey) {
      selectRange(index);
    } else if (event.metaKey || event.ctrlKey) {
      togglePlaylist(playlistId, 'cmd');
    } else {
      togglePlaylist(playlistId, 'none');
    }

    lastClickedIndexRef.current = index;
  }

  return (
    <aside className={styles.root}>
      <div className={styles.heading}>Collection</div>
      <button
        type="button"
        className={[styles.row, selectedPlaylistIds.size === 0 ? styles.active : ''].join(' ').trim()}
        onClick={clearSelection}
      >
        <span className={styles.rowMain}>
          <LibraryBig size={14} />
          All Collection
        </span>
        <span className={styles.count}>{collection?.tracks?.length ?? 0}</span>
      </button>
      <div className={styles.separator} />
      <div className={styles.heading}>Playlists</div>
      {playlists.map((playlist, index) => {
        const isActive = selectedPlaylistIds.has(playlist.playlist_id);
        const playlistLabel = playlist.display_name ?? playlist.name ?? `playlist:${playlist.playlist_id}`;
        return (
          <button
            key={playlist.playlist_id}
            type="button"
            className={[styles.row, isActive ? styles.active : ''].join(' ').trim()}
            onClick={(event) => onPlaylistClick(event, playlist.playlist_id, index)}
            title={String(playlistLabel)}
          >
            <span className={styles.rowMain}>{playlistLabel}</span>
            <span className={styles.count}>{playlist.track_count}</span>
          </button>
        );
      })}
    </aside>
  );
}
