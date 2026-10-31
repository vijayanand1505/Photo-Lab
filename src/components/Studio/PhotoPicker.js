import { useContext, useMemo, useState } from "react";
import { FiCheck, FiSearch, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { photoSource } from "../../utils/Api";
import Dialog from "../shared/Dialog";

export default function PhotoPicker({ title = "Choose photos", onChoose, onClose, multiple = true, limit = 24, excludedIds = [] }) {
  const { images, favorites, collections, navigate } = useContext(ContextApp);
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const photos = useMemo(() => {
    const collectionPhotos = collections.flatMap((collection) => collection.photos);
    const list = source === "gallery" ? images : source === "favorites" ? favorites : source === "collections" ? collectionPhotos : [...images, ...favorites, ...collectionPhotos];
    return [...new Map(list.map((photo) => [photo.id, photo])).values()]
      .filter((photo) => !excludedIds.includes(photo.id) && `${photo.alt} ${photo.photographer}`.toLowerCase().includes(search.toLowerCase()));
  }, [images, favorites, collections, source, search, excludedIds]);
  const choose = (photo) => {
    if (!multiple) { onChoose([photo]); onClose(); return; }
    setSelected((previous) => previous.some((item) => item.id === photo.id) ? previous.filter((item) => item.id !== photo.id) : previous.length < limit ? [...previous, photo] : previous);
  };
  return <Dialog onClose={onClose} labelledBy="photo-picker-title" className="studio-picker">
    <header className="studio-dialog-header"><div><span className="eyebrow">Photo library</span><h2 id="photo-picker-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close photo chooser"><FiX /></button></header>
    <div className="photo-picker-controls"><label className="picker-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search available photos" placeholder="Search photos or photographers" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select aria-label="Photo source" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">All available photos</option><option value="gallery">Current gallery</option><option value="favorites">Favorites</option><option value="collections">Collections</option></select></div>
    <p className="picker-instructions">{multiple ? `Choose up to ${limit} photos. ${selected.length} selected.` : "Choose one photo to start editing."} Your gallery, favorites, and collections are available here.</p>
    <div className="photo-picker-grid">{photos.map((photo) => {
      const checked = selected.some((item) => item.id === photo.id);
      return <button key={photo.id} className={`pick-photo ${checked ? "picked" : ""}`} aria-label={`Choose ${photo.alt || `photo by ${photo.photographer}`}`} aria-pressed={multiple ? checked : undefined}
        disabled={multiple && !checked && selected.length >= limit} onClick={() => choose(photo)}>
        <img src={photoSource(photo, 320)} alt="" loading="lazy" /><span className="pick-photo-caption">{photo.photographer}</span>{checked && <span className="pick-check"><FiCheck /></span>}
      </button>;
    })}</div>
    {photos.length === 0 && <div className="empty-state picker-empty-state"><h3>No photos found</h3><p>Try another source or search. Explore the gallery to find more photos for your project.</p><button className="button button-secondary" onClick={() => { onClose(); navigate("explore"); }}>Explore photos</button></div>}
    <footer className="studio-dialog-footer"><button className="button button-secondary" onClick={onClose}>Cancel</button>{multiple && <button className="button" disabled={!selected.length} onClick={() => { onChoose(selected); onClose(); }}>Add {selected.length || ""} {selected.length === 1 ? "photo" : "photos"}</button>}</footer>
  </Dialog>;
}
