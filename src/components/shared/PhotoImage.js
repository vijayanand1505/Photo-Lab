import { useState } from "react";
import { FiImage, FiRefreshCw } from "react-icons/fi";
import { photoSource, photoSrcSet } from "../../utils/Api";

export default function PhotoImage({ photo, preview = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <div className={`photo-image ${loaded ? "is-loaded" : ""} ${preview ? "preview-image" : ""}`}
    style={{ backgroundColor: preview ? undefined : photo.avg_color || "var(--surface-muted)", aspectRatio: preview ? undefined : `${photo.width || 3} / ${photo.height || 4}` }}>
    {!failed && <img key={attempt} src={photoSource(photo, preview ? 1920 : 480)}
      srcSet={preview ? undefined : photoSrcSet(photo)}
      sizes={preview ? undefined : "(max-width: 540px) 46vw, (max-width: 900px) 44vw, (max-width: 1200px) 29vw, 24vw"}
      width={photo.width} height={photo.height} alt={photo.alt || `Photograph by ${photo.photographer}`}
      loading={preview ? "eager" : "lazy"} decoding="async"
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
    {failed && <div className="image-fallback">
      <FiImage aria-hidden="true" /><span>Photo unavailable</span>
      <button className="button button-small button-secondary" onClick={(event) => {
        event.stopPropagation(); setFailed(false); setLoaded(false); setAttempt((value) => value + 1);
      }}><FiRefreshCw aria-hidden="true" /> Retry image</button>
    </div>}
    {preview && !loaded && !failed && <span className="image-loading"><span className="spinner" /> Loading preview…</span>}
  </div>;
}
