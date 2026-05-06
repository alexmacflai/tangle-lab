import { useMemo, useState } from "react";
import { ComponentsPlayground } from "./components/ComponentsPlayground.jsx";
import { DetailPrototype } from "./components/DetailPrototype.jsx";
import { LibraryPrototype } from "./components/LibraryPrototype.jsx";
import { useAlbums } from "./data/useAlbums.js";

export default function App() {
  if (window.location.pathname === "/components") {
    return <ComponentsPlayground />;
  }

  return <PrototypeApp />;
}

function PrototypeApp() {
  const { albums, isLoading, error } = useAlbums();
  const [view, setView] = useState(window.location.pathname === "/detail" ? "detail" : "library");
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const selectedAlbum = useMemo(
    () =>
      albums.find((album) => album.id === selectedAlbumId) ??
      albums.find((album) => album.id === "ctm-vind") ??
      albums[0],
    [albums, selectedAlbumId],
  );

  if (view === "detail" && selectedAlbum) {
    return <DetailPrototype album={selectedAlbum} onBack={() => setView("library")} />;
  }

  return (
    <LibraryPrototype
      albums={albums}
      isLoading={isLoading}
      error={error}
      onOpenAlbum={(album) => {
        setSelectedAlbumId(album.id);
        setView("detail");
      }}
    />
  );
}
