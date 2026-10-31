import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { buildPhotoUrl, EMPTY_FILTERS, getImages, photoSource } from "./Api";
import { readStored, usePersistentState, validCollections, validFavorites } from "./storage";
import StudioProvider from "../components/Studio/StudioContext";
import useUndoActions from "./useUndoActions";
import useSharedPhoto from "./useSharedPhoto";

export const ContextApp = createContext();

export default function AppContext({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, tone = "info") => setToast({ message, tone, id: Date.now() }), []);
  const undo = useUndoActions(notify);
  const { offerUndo: registerUndo } = undo;
  const offerUndo = useCallback((message, restore) => { setToast(null); registerUndo(message, restore); }, [registerUndo]);
  const [favorites, setFavorites] = usePersistentState("photo-lab:favorites", [], validFavorites, notify);
  const [collections, setCollections] = usePersistentState("photo-lab:collections", [], validCollections, notify);
  const [theme, setTheme] = useState(() => readStored("photo-lab:theme", null, (v) => ["light", "dark"].includes(v)) ||
    (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const [view, setView] = useState("explore");
  const [collectionId, setCollectionId] = useState(null);
  const [request, setRequest] = useState({ query: "", filters: { ...EMPTY_FILTERS }, page: 1 });
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(null);
  const [retryId, setRetryId] = useState(0);
  const [searchVersion, setSearchVersion] = useState(0);
  const [viewer, setViewer] = useState(null);
  const [sharingPhoto, setSharingPhoto] = useState(null);
  const { status: sharedPhotoStatus, close: closeSharedPhoto, retry: retrySharedPhoto } = useSharedPhoto(setViewer);
  const [collectionPhoto, setCollectionPhoto] = useState(null);
  const [download, setDownload] = useState(null);
  const downloadController = useRef(null);
  const requestId = useRef(0);
  const collectionsRef = useRef(collections);
  collectionsRef.current = collections;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#151b18" : "#f8f7f4");
    try { localStorage.setItem("photo-lab:theme", JSON.stringify(theme)); } catch { /* Theme still works for this visit. */ }
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.tone === "success" ? 3000 : toast.tone === "error" ? 6000 : 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    getImages(buildPhotoUrl(request), controller.signal).then((data) => {
      if (controller.signal.aborted || id !== requestId.current) return;
      setImages((previous) => {
        const photos = request.page === 1 ? data.photos : [...previous, ...data.photos];
        return [...new Map(photos.map((photo) => [photo.id, photo])).values()];
      });
      setTotal(Number.isFinite(data.total_results) ? data.total_results : null);
      setHasMore(Boolean(data.next_page) && data.photos.length > 0);
    }).catch((reason) => {
      if (controller.signal.aborted || id !== requestId.current) return;
      setError(reason instanceof TypeError ? "You're offline or the photo service is unavailable. Check your connection and try again." : reason.message);
    }).finally(() => {
      if (!controller.signal.aborted && id === requestId.current) setLoading(false);
    });
    return () => controller.abort();
  }, [request, retryId]);

  useEffect(() => () => downloadController.current?.abort(), []);

  const navigate = (nextView) => { setView(nextView); setCollectionId(null); };
  const search = (query = draft) => {
    const trimmed = query.trim();
    setDraft(trimmed);
    setSearchVersion((previous) => previous + 1);
    setImages([]); setTotal(null); setError(""); setLoading(true); setView("explore");
    setRequest((previous) => ({ ...previous, query: trimmed, page: 1 }));
  };
  const changeFilters = (filters) => {
    setSearchVersion((previous) => previous + 1);
    setImages([]); setTotal(null); setError(""); setLoading(true);
    setRequest((previous) => ({ ...previous, filters, page: 1 }));
  };
  const toggleFavorite = (photo) => {
    const exists = favorites.some((item) => item.id === photo.id);
    setFavorites((previous) => exists ? previous.filter((item) => item.id !== photo.id) : [photo, ...previous]);
    if (exists) {
      const index = favorites.findIndex((item) => item.id === photo.id);
      offerUndo("Removed from favorites", () => setFavorites((previous) => {
        if (previous.some((item) => item.id === photo.id)) return previous;
        const next = [...previous]; next.splice(Math.min(index, next.length), 0, photo); return next;
      }));
    } else notify("Saved to your favorites", "success");
  };
  const createCollection = (name, photo = null) => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return null;
    if (collections.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) {
      notify("You already have a collection with that name."); return null;
    }
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setCollections((previous) => [...previous, { id, name: trimmed, photos: photo ? [photo] : [] }]);
    notify(photo ? `Photo added to ${trimmed}` : `Created ${trimmed}`);
    return id;
  };
  const renameCollection = (id, name) => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return false;
    if (collections.some((item) => item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase())) {
      notify("You already have a collection with that name."); return false;
    }
    setCollections((previous) => previous.map((item) => item.id === id ? { ...item, name: trimmed } : item));
    notify("Collection renamed"); return true;
  };
  const deleteCollection = (id) => {
    const index = collections.findIndex((item) => item.id === id);
    const removed = collections[index];
    if (!removed) return;
    setCollections((previous) => previous.filter((item) => item.id !== id));
    if (collectionId === id) setCollectionId(null);
    offerUndo(`Deleted ${removed.name}`, () => setCollections((previous) => {
      if (previous.some((item) => item.id === id)) return previous;
      const names = new Set(previous.map((item) => item.name.toLowerCase()));
      let name = removed.name, suffix = 1;
      while (names.has(name.toLowerCase())) { name = `${removed.name} (restored${suffix === 1 ? "" : ` ${suffix}`})`; suffix += 1; }
      const next = [...previous]; next.splice(Math.min(index, next.length), 0, { ...removed, name }); return next;
    }));
  };
  const toggleCollectionPhoto = (id, photo) => {
    const collection = collections.find((item) => item.id === id);
    if (!collection) return;
    const index = collection.photos.findIndex((item) => item.id === photo.id);
    setCollections((previous) => previous.map((item) => {
      if (item.id !== id) return item;
      const exists = item.photos.some((saved) => saved.id === photo.id);
      return { ...item, photos: exists ? item.photos.filter((saved) => saved.id !== photo.id) : [photo, ...item.photos] };
    }));
    if (index >= 0) offerUndo(`Removed from ${collection.name}`, () => {
      if (!collectionsRef.current.some((item) => item.id === id)) { notify("Restore the deleted collection first, then undo this removal."); return false; }
      setCollections((previous) => previous.map((item) => {
        if (item.id !== id || item.photos.some((entry) => entry.id === photo.id)) return item;
        const photos = [...item.photos]; photos.splice(Math.min(index, photos.length), 0, photo); return { ...item, photos };
      }));
    });
  };

  const closeViewer = useCallback(() => { setViewer(null); closeSharedPhoto(); }, [closeSharedPhoto]);
  const closeCollectionPicker = useCallback(() => setCollectionPhoto(null), []);
  const activeCollection = collections.find((item) => item.id === collectionId);
  const visibleImages = view === "favorites" ? favorites : view === "collections" ? activeCollection?.photos || [] : images;
  const openPhoto = (photo) => {
    closeSharedPhoto();
    const index = visibleImages.findIndex((item) => item.id === photo.id);
    setViewer({ photos: index < 0 ? [photo] : [...visibleImages], index: Math.max(0, index) });
  };
  const movePhoto = useCallback((direction) => setViewer((previous) => previous ? {
    ...previous, index: (previous.index + direction + previous.photos.length) % previous.photos.length,
  } : null), []);

  const downloadPhoto = async (photo, size) => {
    if (downloadController.current) return;
    const controller = new AbortController();
    downloadController.current = controller;
    setDownload({ photoId: photo.id, progress: null });
    try {
      const width = { small: 640, medium: 1280, large: 2400 }[size];
      const response = await fetch(width ? photoSource(photo, width) : photo.src.original, { signal: controller.signal });
      if (!response.ok) throw new Error("Download failed. Please try again.");
      const length = Number(response.headers.get("content-length"));
      let blob;
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); received += value.length;
          if (length > 0) setDownload({ photoId: photo.id, progress: Math.min(100, Math.round(received / length * 100)) });
        }
        blob = new Blob(chunks, { type: response.headers.get("content-type") || "image/jpeg" });
      } else blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      link.href = url;
      link.download = `${(photo.alt || "photo-lab").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-${photo.id}.${extension}`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Photo downloaded.", "success");
    } catch (reason) {
      if (reason.name !== "AbortError") notify("Couldn't download this photo. Check your connection and try again.", "error");
    } finally { downloadController.current = null; setDownload(null); }
  };

  return <ContextApp.Provider value={{
    toast, notify, ...undo, offerUndo, dismissToast: () => setToast(null), favorites, collections, theme, searchVersion,
    toggleTheme: () => setTheme((previous) => previous === "light" ? "dark" : "light"),
    view, navigate, collectionId, setCollectionId, activeCollection,
    draft, setDraft, search, query: request.query, filters: request.filters, changeFilters,
    images: visibleImages, loading: view === "explore" && loading, error: view === "explore" ? error : "",
    total, hasMore: view === "explore" && hasMore,
    loadMore: () => { if (!loading && hasMore && !error) setRequest((previous) => ({ ...previous, page: previous.page + 1 })); },
    retry: () => setRetryId((previous) => previous + 1),
    resetExplore: () => {
      setSearchVersion((previous) => previous + 1);
      setDraft(""); setImages([]); setTotal(null); setError(""); setLoading(true); setView("explore");
      setRequest({ query: "", filters: { ...EMPTY_FILTERS }, page: 1 });
    },
    toggleFavorite, createCollection, renameCollection, deleteCollection, toggleCollectionPhoto,
    viewer, openPhoto, closeViewer, movePhoto, collectionPhoto, setCollectionPhoto, closeCollectionPicker,
    sharingPhoto, setSharingPhoto, sharedPhotoStatus, closeSharedPhoto, retrySharedPhoto,
    download, downloadPhoto, cancelDownload: () => downloadController.current?.abort(),
  }}><StudioProvider notify={notify} offerUndo={offerUndo}>{children}</StudioProvider></ContextApp.Provider>;
}
