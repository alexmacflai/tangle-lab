import { useEffect, useState } from "react";
import { vinylAssetPath } from "./assetPaths.js";

export const FALLBACK_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23191513'/%3E%3Cstop offset='1' stop-color='%2328221e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='640' fill='url(%23bg)'/%3E%3Crect x='64' y='64' width='512' height='512' fill='none' stroke='%23413831' stroke-width='4' rx='14'/%3E%3Cpath d='M96 470 C180 405 260 520 348 456 C432 396 476 460 544 430' fill='none' stroke='%2363544a' stroke-width='18' stroke-linecap='round'/%3E%3Cpath d='M96 178 C170 220 240 128 320 184 C405 245 476 154 544 198' fill='none' stroke='%23544a43' stroke-width='14' stroke-linecap='round'/%3E%3C/svg%3E";

export const FALLBACK_VINYL_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 320'%3E%3Crect width='320' height='320' fill='%232b2623'/%3E%3Ccircle cx='160' cy='160' r='128' fill='%233f3832'/%3E%3Ccircle cx='160' cy='160' r='58' fill='%23554d45'/%3E%3Ccircle cx='160' cy='160' r='11' fill='%23f4efe7'/%3E%3C/svg%3E";

export const SHARED_VINYL_ART = vinylAssetPath("/media/vinyl-labels/bloop-schallaufnahmen-label.png");

function formatDuration(durationSeconds) {
  if (typeof durationSeconds !== "number" || Number.isNaN(durationSeconds) || durationSeconds <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizeGenre(genre) {
  if (Array.isArray(genre)) {
    return genre.join(", ");
  }

  if (typeof genre === "string" && genre.trim().length > 0) {
    return genre;
  }

  return "Uncategorized";
}

function mapAlbum(rawAlbum, index) {
  return {
    id: rawAlbum.id ?? `album-${index + 1}`,
    title: rawAlbum.title ?? "Untitled Album",
    artist: rawAlbum.artist ?? "Unknown Artist",
    cover: vinylAssetPath(rawAlbum.sleeveImage) || FALLBACK_COVER,
    stickers: Array.isArray(rawAlbum.stickers) ? rawAlbum.stickers : [],
    year: rawAlbum.year ?? "Unknown",
    label: rawAlbum.label ?? "Unknown",
    catalogNumber: rawAlbum.catalogNumber ?? "N/A",
    duration: formatDuration(rawAlbum.durationSeconds),
    description: rawAlbum.description ?? "No description available.",
    genre: normalizeGenre(rawAlbum.genre),
    releaseNotes:
      rawAlbum.releaseContext ?? rawAlbum.comment ?? "No release notes available.",
    audioUrl: vinylAssetPath(rawAlbum.audioUrl) || null,
    vinylArt: SHARED_VINYL_ART,
  };
}

export function useAlbums() {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadAlbums() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(vinylAssetPath("/data/albums.json"));
        if (!response.ok) {
          throw new Error(`Failed to load albums: ${response.status}`);
        }

        const payload = await response.json();
        const source = Array.isArray(payload.albums) ? payload.albums : [];

        if (!isCancelled) {
          setAlbums(source.map(mapAlbum));
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError.message || "Failed to load albums");
          setAlbums([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAlbums();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    albums,
    isLoading,
    error,
  };
}
