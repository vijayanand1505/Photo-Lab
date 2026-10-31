import { useCallback, useEffect, useState } from "react";
import { getPhoto } from "./Api";
import { isPhotoId } from "./sharing";

const readPhotoId = () => new URLSearchParams(window.location.search).get("photo");

export default function useSharedPhoto(setViewer) {
  const [id, setId] = useState(readPhotoId);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const onPopState = () => {
      if (readPhotoId() === id) return;
      setViewer(null);
      setId(readPhotoId());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [id, setViewer]);

  useEffect(() => {
    if (id === null) { setStatus(null); return; }
    if (!isPhotoId(id)) {
      setStatus({ error: "This photo link is invalid. Browse photos to find something new.", canRetry: false });
      return;
    }
    const controller = new AbortController();
    setStatus({ loading: true });
    getPhoto(id, controller.signal).then((photo) => {
      if (controller.signal.aborted) return;
      setViewer({ photos: [photo], index: 0 });
      setStatus(null);
    }).catch((error) => {
      if (!controller.signal.aborted) setStatus({ error: error instanceof TypeError ? "Couldn't open this photo. Check your connection and try again." : error.message, canRetry: true });
    });
    return () => controller.abort();
  }, [id, attempt, setViewer]);

  const close = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("photo")) {
      url.searchParams.delete("photo");
      window.history.replaceState(window.history.state, "", url.href);
    }
    setId(null);
    setStatus(null);
  }, []);

  return { status, close, retry: () => setAttempt((previous) => previous + 1) };
}
