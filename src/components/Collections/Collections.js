import { useContext, useState } from "react";
import { FiArrowLeft, FiArrowUpRight, FiCheck, FiEdit2, FiFolder, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { photoSource } from "../../utils/Api";
import Dialog from "../shared/Dialog";
import CardContainer from "../CardContainer/CardContainer";

export function CollectionPicker() {
  const { collectionPhoto, closeCollectionPicker, collections, createCollection, toggleCollectionPhoto, notify } = useContext(ContextApp);
  const [name, setName] = useState("");
  return <Dialog onClose={closeCollectionPicker} labelledBy="picker-title" describedBy="picker-description" className="small-dialog">
    <div className="dialog-heading"><span className="eyebrow">Collections</span><button className="icon-button" onClick={closeCollectionPicker} aria-label="Close collection picker"><FiX /></button></div>
    <h2 id="picker-title">Save to a collection</h2><p id="picker-description" className="muted">Select a collection to add or remove this photo.</p>
    <div className="picker-photo"><img src={photoSource(collectionPhoto, 150)} width="64" height="64" alt="" /><span>Selected photo<small>by {collectionPhoto.photographer}</small></span></div>
    <div className="collection-options">
      {collections.map((collection) => {
        const selected = collection.photos.some((photo) => photo.id === collectionPhoto.id);
        return <button key={collection.id} className="collection-option" aria-pressed={selected} onClick={() => {
          toggleCollectionPhoto(collection.id, collectionPhoto); if (!selected) notify(`Added to ${collection.name}`);
        }}><FiFolder aria-hidden="true" /><span>{collection.name}<small>{collection.photos.length} photos</small></span><span className={`check-box ${selected ? "checked" : ""}`}>{selected && <FiCheck aria-hidden="true" />}</span></button>;
      })}
      {collections.length === 0 && <p className="picker-empty">No collections yet. Enter a name to create one.</p>}
    </div>
    <form className="collection-form" onSubmit={(event) => { event.preventDefault(); if (createCollection(name, collectionPhoto)) setName(""); }}>
      <label htmlFor="new-collection">Create a new collection</label><div className="input-row"><input id="new-collection" placeholder="e.g. Travel photos" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} required />
        <button className="button" disabled={!name.trim()} type="submit"><FiPlus aria-hidden="true" /> Create</button></div>
    </form>
    <button className="button picker-done" onClick={closeCollectionPicker}>Done <FiCheck aria-hidden="true" /></button>
  </Dialog>;
}

export default function Collections() {
  const { collections, activeCollection, setCollectionId, createCollection, renameCollection, deleteCollection } = useContext(ContextApp);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [name, setName] = useState("");
  const startEditing = (collection) => { setName(collection?.name || ""); setEditing(collection || { id: null }); };
  return <section className="library shell" aria-labelledby="collections-title">
    <div className="section-heading library-heading"><div>
      {activeCollection && <button className="text-button back-link" onClick={() => setCollectionId(null)}><FiArrowLeft aria-hidden="true" /> All collections</button>}
      <h1 id="collections-title">{activeCollection?.name || "Collections"}</h1>
      <p className="muted">{activeCollection ? `${activeCollection.photos.length} ${activeCollection.photos.length === 1 ? "photo" : "photos"}` : "Group photos by project or topic."}</p>
    </div><div className="heading-actions">{activeCollection ? <>
      <button className="button button-secondary" onClick={() => startEditing(activeCollection)}><FiEdit2 aria-hidden="true" /> Rename</button>
      <button className="icon-button danger" aria-label={`Delete ${activeCollection.name}`} onClick={() => setDeleting(activeCollection)}><FiTrash2 /></button>
    </> : <button className="button" onClick={() => startEditing(null)}><FiPlus aria-hidden="true" /> New collection</button>}</div></div>
    {activeCollection ? <CardContainer /> : collections.length > 0 ? <div className="collections-grid">{collections.map((collection) =>
      <article className="collection-card" key={collection.id}>
        <button className="collection-cover-button" onClick={() => setCollectionId(collection.id)} aria-label={`Open ${collection.name}, ${collection.photos.length} photos`}>
          <div className={`collection-cover ${collection.photos.length === 0 ? "cover-empty" : ""}`}>
            {collection.photos.length ? collection.photos.slice(0, 3).map((photo) => <img key={photo.id} src={photoSource(photo, 600)} alt="" loading="lazy" />) : <><FiFolder /><span>No photos added</span></>}
          </div>
          <div className="collection-card-title"><h2>{collection.name}</h2><FiArrowUpRight aria-hidden="true" /></div>
          <p className="muted">{collection.photos.length} {collection.photos.length === 1 ? "photo" : "photos"}</p>
        </button>
        <div className="collection-card-tools"><button className="icon-button" onClick={() => startEditing(collection)} aria-label={`Rename ${collection.name}`}><FiEdit2 /></button>
          <button className="icon-button danger" onClick={() => setDeleting(collection)} aria-label={`Delete ${collection.name}`}><FiTrash2 /></button></div>
      </article>)}</div> : <div className="empty-state"><span className="empty-icon"><FiFolder /></span><h3>No collections yet</h3>
      <p>Create a collection, then add photos from the gallery.</p><button className="button" onClick={() => startEditing(null)}><FiPlus aria-hidden="true" /> Create your first collection</button></div>}
    <p className="storage-note">Your collections and favorites are saved in this browser.</p>
    {editing && <Dialog onClose={() => setEditing(null)} labelledBy="collection-form-title" className="small-dialog">
      <div className="dialog-heading"><span className="eyebrow">Collections</span><button className="icon-button" aria-label="Close collection form" onClick={() => setEditing(null)}><FiX /></button></div>
      <h2 id="collection-form-title">{editing.id ? "Rename collection" : "New collection"}</h2><p className="muted">Enter a name for this collection.</p>
      <form className="collection-form" onSubmit={(event) => {
        event.preventDefault();
        if (editing.id ? renameCollection(editing.id, name) : createCollection(name)) setEditing(null);
      }}><label htmlFor="collection-name">Collection name</label><input id="collection-name" data-autofocus placeholder="e.g. Website photos" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} required />
        <div className="dialog-footer"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button" disabled={!name.trim()}>{editing.id ? "Save name" : "Create collection"}</button></div>
      </form>
    </Dialog>}
    {deleting && <Dialog onClose={() => setDeleting(null)} labelledBy="delete-title" describedBy="delete-description" className="small-dialog">
      <div className="dialog-heading"><span className="eyebrow">Collections</span><button className="icon-button" aria-label="Close delete confirmation" onClick={() => setDeleting(null)}><FiX /></button></div>
      <h2 id="delete-title">Delete “{deleting.name}”?</h2><p className="muted" id="delete-description">This removes the collection and its saved photo list. Your favorites will stay saved.</p>
      <div className="dialog-footer"><button className="button button-secondary" data-autofocus onClick={() => setDeleting(null)}>Keep collection</button><button className="button button-danger" onClick={() => { deleteCollection(deleting.id); setDeleting(null); }}>Delete collection</button></div>
    </Dialog>}
  </section>;
}
