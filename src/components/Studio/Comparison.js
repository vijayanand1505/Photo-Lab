import { useContext, useState } from "react";
import { FiColumns, FiEdit2, FiHeart, FiPlus, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { StudioContext } from "./StudioContext";
import { photoSource } from "../../utils/Api";
import Dialog from "../shared/Dialog";
import PhotoPicker from "./PhotoPicker";
import CreatorCredit from "../shared/CreatorCredit";

const gcd = (a, b) => b ? gcd(b, a % b) : a;
function CompareImage({ photo, fit }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <div className="comparison-image">{failed ? <div className="image-fallback"><span>Photo unavailable</span><button className="button button-small button-secondary" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Retry image</button></div>
    : <img key={attempt} src={photoSource(photo, 1000)} alt={photo.alt || `Photo by ${photo.photographer}`} style={{ objectFit: fit }} onError={() => setFailed(true)} />}</div>;
}
export function ComparisonDock() {
  const { comparedPhotos, setComparisonOpen, clearComparison, comparisonOpen } = useContext(StudioContext);
  if (!comparedPhotos.length || comparisonOpen) return null;
  return <div className="comparison-dock" aria-label="Selected photos for comparison"><div className="dock-thumbnails">{comparedPhotos.map((photo) => <img key={photo.id} src={photoSource(photo, 100)} alt="" />)}</div>
    <span>{comparedPhotos.length}/4 selected</span><button className="button button-small" disabled={comparedPhotos.length < 2} onClick={() => setComparisonOpen(true)}><FiColumns aria-hidden="true" /> Compare</button><button className="icon-button" onClick={clearComparison} aria-label="Clear comparison selection"><FiX /></button>
  </div>;
}
export default function Comparison() {
  const { comparedPhotos, toggleCompare, addComparison, setComparisonOpen, setEditorPhoto } = useContext(StudioContext);
  const { favorites, toggleFavorite } = useContext(ContextApp);
  const [picker, setPicker] = useState(false);
  const [fit, setFit] = useState("contain");
  const highest = Math.max(...comparedPhotos.map((photo) => photo.width * photo.height));
  return <><Dialog onClose={() => setComparisonOpen(false)} labelledBy="comparison-title" className="comparison-dialog">
    <header className="studio-dialog-header"><div><span className="eyebrow">Photo Lab</span><h2 id="comparison-title">Compare photos</h2></div><button className="icon-button" data-autofocus aria-label="Close photo comparison" onClick={() => setComparisonOpen(false)}><FiX /></button></header>
    <div className="comparison-toolbar"><p className="muted">{comparedPhotos.length} of 4 photos · Compare up to four photos.</p><div><select aria-label="Comparison image fit" value={fit} onChange={(event) => setFit(event.target.value)}><option value="contain">Show full photo</option><option value="cover">Fill frame</option></select><button className="button button-secondary" onClick={() => setPicker(true)} disabled={comparedPhotos.length >= 4}><FiPlus /> Add photos</button></div></div>
    {comparedPhotos.length > 0 ? <div className="comparison-scroll"><div className="comparison-grid" style={{ "--compare-count": comparedPhotos.length }}>{comparedPhotos.map((photo, index) => {
      const divisor = gcd(photo.width || 1, photo.height || 1);
      const saved = favorites.some((item) => item.id === photo.id);
      return <article className="comparison-card" key={photo.id}><div className="comparison-card-top"><span>{photo.width * photo.height === highest ? "Highest resolution" : "Photo"}</span><button className="icon-button" onClick={() => toggleCompare(photo)} aria-label={`Remove ${photo.alt || photo.photographer} from comparison`}><FiX /></button></div>
        <CompareImage photo={photo} fit={fit} /><div className="comparison-card-details"><h3>Photo {index + 1}</h3><a href={photo.photographer_url || photo.url} target="_blank" rel="noreferrer">by {photo.photographer} ↗</a><dl><div><dt>Dimensions</dt><dd>{photo.width?.toLocaleString()} × {photo.height?.toLocaleString()}</dd></div><div><dt>Resolution</dt><dd>{(photo.width * photo.height / 1000000).toFixed(1)} MP</dd></div><div><dt>Aspect ratio</dt><dd>{photo.width / divisor}:{photo.height / divisor}</dd></div><div><dt>Orientation</dt><dd>{photo.width === photo.height ? "Square" : photo.width > photo.height ? "Landscape" : "Portrait"}</dd></div><div><dt>Average color</dt><dd><span className="metadata-color" style={{ background: photo.avg_color || "transparent" }} />{photo.avg_color || "Not available"}</dd></div></dl>
          <div className="comparison-card-actions"><button className={`button button-small button-secondary ${saved ? "is-saved" : ""}`} aria-pressed={saved} onClick={() => toggleFavorite(photo)}><FiHeart aria-hidden="true" />{saved ? "Saved" : "Favorite"}</button><button className="button button-small button-secondary" onClick={() => setEditorPhoto(photo)} aria-label={`Edit ${photo.alt || photo.photographer}`}><FiEdit2 aria-hidden="true" />Edit</button></div></div>
      </article>;
    })}</div></div> : <div className="empty-state"><span className="empty-icon"><FiColumns /></span><h3>Choose photos to compare</h3><p>Choose two to four photos to compare their composition, dimensions, and colors.</p><button className="button" onClick={() => setPicker(true)}><FiPlus /> Choose photos</button></div>}
    <footer className="comparison-footer"><div><p>{comparedPhotos.length < 2 ? "Add at least two photos for a side-by-side comparison." : "On smaller screens, swipe across to compare every photo."}</p><CreatorCredit className="studio-creator-credit" /></div><button className="button button-secondary" onClick={() => setComparisonOpen(false)}>Back to browsing</button></footer>
  </Dialog>{picker && <PhotoPicker title="Add photos to compare" limit={4 - comparedPhotos.length} excludedIds={comparedPhotos.map((photo) => photo.id)} onChoose={addComparison} onClose={() => setPicker(false)} />}</>;
}
