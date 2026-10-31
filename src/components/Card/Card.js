import { useContext } from "react";
import { FiCheck, FiMoreHorizontal, FiHeart, FiPlus, FiMinus } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import PhotoImage from "../shared/PhotoImage";
import { StudioContext } from "../Studio/StudioContext";

export default function Card({ item }) {
  const { openPhoto, favorites, toggleFavorite, setCollectionPhoto, activeCollection, view, toggleCollectionPhoto } = useContext(ContextApp);
  const saved = favorites.some((photo) => photo.id === item.id);
  const { setActionPhoto, comparedPhotos } = useContext(StudioContext);
  const comparing = comparedPhotos.some((photo) => photo.id === item.id);
  return <article className={`photo-card ${comparing ? "is-comparing" : ""}`}>
    <PhotoImage photo={item} />
    <button className="photo-open" aria-label={`View ${item.alt || `photo by ${item.photographer}`}`} onClick={() => openPhoto(item)} />
    {saved && <span className="saved-badge"><FiCheck aria-hidden="true" />Saved<span className="sr-only"> to favorites</span></span>}
    <div className="card-actions">
      <button className={`card-action ${saved ? "is-saved" : ""}`} aria-label={`${saved ? "Remove from" : "Add to"} favorites: ${item.alt || item.photographer}`}
        aria-pressed={saved} title={saved ? "Remove favorite" : "Save favorite"} onClick={() => toggleFavorite(item)}><FiHeart aria-hidden="true" /></button>
      <button className="card-action" aria-label={`Add photo by ${item.photographer} to a collection`} title="Add to collection" onClick={() => setCollectionPhoto(item)}><FiPlus aria-hidden="true" /></button>
      {view === "collections" && activeCollection && <button className="card-action" aria-label={`Remove photo by ${item.photographer} from ${activeCollection.name}`} title="Remove from this collection"
        onClick={() => toggleCollectionPhoto(activeCollection.id, item)}><FiMinus aria-hidden="true" /></button>}
    </div>
    <div className="card-caption"><a href={item.photographer_url || item.url} target="_blank" rel="noreferrer"><span className="photographer-initial">{item.photographer?.charAt(0) || "P"}</span>{item.photographer}</a><button className="photo-tools-button" aria-label={`Photo tools for ${item.alt || item.photographer}`} title="Edit, moodboard, or compare" onClick={() => setActionPhoto(item)}><FiMoreHorizontal /></button></div>
  </article>;
}
