import { useContext, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiCheck, FiDownload, FiHeart, FiPlus, FiX, FiEdit2, FiGrid, FiColumns } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import Dialog from "../shared/Dialog";
import Tooltip from "../shared/Tooltip";
import PhotoImage from "../shared/PhotoImage";
import { StudioContext } from "../Studio/StudioContext";

export default function LightBox() {
  const { viewer, closeViewer, movePhoto, favorites, toggleFavorite, setCollectionPhoto, download, downloadPhoto, cancelDownload } = useContext(ContextApp);
  const [size, setSize] = useState("large");
  const { setEditorPhoto, setBoardPhoto, comparedPhotos, toggleCompare } = useContext(StudioContext);
  const photo = viewer.photos[viewer.index];
  const saved = favorites.some((item) => item.id === photo.id);
  const dimension = (width) => `${Math.min(width, photo.width)} × ${Math.round(photo.height * Math.min(width, photo.width) / photo.width)} px`;
  return <Dialog onClose={closeViewer} labelledBy="viewer-title" className="photo-dialog" onKeyDown={(event) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); movePhoto(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); movePhoto(1); }
  }}>
    <div className="viewer-topbar"><span className="viewer-counter">{String(viewer.index + 1).padStart(2, "0")} <span>/ {viewer.photos.length} photos</span></span>
      <div className="viewer-top-actions"><Tooltip label={saved ? "Saved to favorites · Click to remove" : "Save to favorites"}><button className={`icon-button ${saved ? "is-saved" : ""}`} aria-label={saved ? "Remove photo from favorites" : "Save photo to favorites"} aria-pressed={saved} onClick={() => toggleFavorite(photo)}><FiHeart /></button></Tooltip>
        <Tooltip label="Save to a collection"><button className="icon-button" aria-label="Save photo to a collection" onClick={() => setCollectionPhoto(photo)}><FiPlus /></button></Tooltip>
        <span className="divider" /><button className="icon-button" data-autofocus aria-label="Close photo preview" onClick={closeViewer}><FiX /></button></div>
    </div>
    <div className="viewer-content">
      <div className="viewer-stage"><PhotoImage key={photo.id} photo={photo} preview />
        {viewer.photos.length > 1 && <><button className="viewer-arrow previous" aria-label="Previous photo" onClick={() => movePhoto(-1)}><FiArrowLeft /></button><button className="viewer-arrow next" aria-label="Next photo" onClick={() => movePhoto(1)}><FiArrowRight /></button></>}
      </div>
      <aside className="viewer-details"><span className="eyebrow">Photo details</span><h2 id="viewer-title">Photo by {photo.photographer || "Unknown photographer"}</h2>
        <a className="photographer-link" href={photo.photographer_url || photo.url} target="_blank" rel="noreferrer"><span className="photographer-avatar">{photo.photographer?.charAt(0) || "P"}</span><span><small>Photographer</small><strong>{photo.photographer}</strong></span><FiArrowUpRight aria-hidden="true" /></a>
        <dl className="photo-metadata"><div><dt>Original size</dt><dd>{photo.width?.toLocaleString()} × {photo.height?.toLocaleString()}</dd></div><div><dt>Orientation</dt><dd>{photo.width === photo.height ? "Square" : photo.width > photo.height ? "Landscape" : "Portrait"}</dd></div>
          {photo.avg_color && <div><dt>Average color</dt><dd><span className="metadata-color" style={{ background: photo.avg_color }} />{photo.avg_color}</dd></div>}</dl>
        <div className="viewer-creative-actions"><button className="button button-small button-secondary" onClick={() => setEditorPhoto(photo)}><FiEdit2 /> Edit photo</button><button className="button button-small button-secondary" onClick={() => setBoardPhoto(photo)}><FiGrid /> Add to moodboard</button><button className="button button-small button-secondary" aria-pressed={comparedPhotos.some((item) => item.id === photo.id)} onClick={() => toggleCompare(photo)}><FiColumns />{comparedPhotos.some((item) => item.id === photo.id) ? "Selected to compare" : "Select to compare"}</button></div>
        <div className="download-options"><label htmlFor="download-size">Download size</label><select id="download-size" value={size} onChange={(event) => setSize(event.target.value)}>
          <option value="small">Small · {dimension(640)}</option><option value="medium">Medium · {dimension(1280)}</option><option value="large">Large · {dimension(2400)}</option><option value="original">Original · {photo.width} × {photo.height} px</option>
        </select><button className="button download-button" disabled={Boolean(download)} onClick={() => downloadPhoto(photo, size)}>{download ? <span className="spinner" /> : <FiDownload aria-hidden="true" />}{download ? "Downloading…" : "Download photo"}</button>
          {download && <button className="text-button" onClick={cancelDownload}>Cancel download</button>}</div>
        <p className="license-note"><FiCheck aria-hidden="true" /><span>Free to use under the <a href="https://www.pexels.com/license/" target="_blank" rel="noreferrer">Pexels license</a>.</span></p>
        <a className="text-button pexels-link" href={photo.url} target="_blank" rel="noreferrer">View photo on Pexels <FiArrowUpRight aria-hidden="true" /></a>
        <p className="keyboard-hint">← → for previous or next photo · Esc to close</p>
      </aside>
    </div>
  </Dialog>;
}
