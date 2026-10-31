import { useContext, useState } from "react";
import { FiArrowRight, FiCheck, FiColumns, FiEdit2, FiGrid, FiPlus, FiShare2, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { StudioContext } from "./StudioContext";
import { photoSource } from "../../utils/Api";
import Dialog from "../shared/Dialog";
import Editor from "./Editor";
import Comparison from "./Comparison";
import PhotoPicker from "./PhotoPicker";

function PhotoActions() {
  const { setSharingPhoto } = useContext(ContextApp);
  const { actionPhoto: photo, setActionPhoto, setEditorPhoto, setBoardPhoto, comparedPhotos, toggleCompare } = useContext(StudioContext);
  const selected = comparedPhotos.some((item) => item.id === photo.id);
  return <Dialog onClose={() => setActionPhoto(null)} labelledBy="photo-actions-title" className="small-dialog studio-small-dialog"><div className="dialog-heading"><span className="eyebrow">Photo Lab</span><button className="icon-button" aria-label="Close photo tools" onClick={() => setActionPhoto(null)}><FiX /></button></div><h2 id="photo-actions-title">Photo tools</h2><div className="picker-photo"><img src={photoSource(photo, 150)} alt="" /><span>Selected photo<small>by {photo.photographer}</small></span></div>
    <div className="photo-tools-list"><button aria-label="Edit photo" onClick={() => { setActionPhoto(null); setEditorPhoto(photo); }}><FiEdit2 /><span>Edit photo<small>Crop, adjust, add text, and export</small></span><FiArrowRight /></button><button aria-label="Add to moodboard" onClick={() => { setActionPhoto(null); setBoardPhoto(photo); }}><FiGrid /><span>Add to moodboard<small>Add this photo to a board</small></span><FiArrowRight /></button><button aria-label={selected ? "Remove from comparison" : "Select for comparison"} aria-pressed={selected} onClick={() => { toggleCompare(photo); setActionPhoto(null); }}><FiColumns /><span>{selected ? "Remove from comparison" : "Select for comparison"}<small>Compare up to four photos side by side</small></span>{selected ? <FiCheck /> : <FiPlus />}</button><button aria-label="Share photo" onClick={() => { setActionPhoto(null); setSharingPhoto(photo); }}><FiShare2 /><span>Share photo<small>Send a link that opens in Photo Lab</small></span><FiArrowRight /></button></div>
  </Dialog>;
}
function BoardPicker() {
  const { boardPhoto: photo, setBoardPhoto, boards, newBoard, addToBoard } = useContext(StudioContext);
  const { notify } = useContext(ContextApp);
  const [name, setName] = useState("");
  return <Dialog onClose={() => setBoardPhoto(null)} labelledBy="board-picker-title" className="small-dialog studio-small-dialog"><div className="dialog-heading"><span className="eyebrow">Moodboards</span><button className="icon-button" aria-label="Close moodboard picker" onClick={() => setBoardPhoto(null)}><FiX /></button></div><h2 id="board-picker-title">Add to a moodboard</h2><p className="muted">Choose a moodboard or create one below.</p><div className="collection-options board-options">{boards.map((board) => <button className="collection-option" key={board.id} disabled={board.items.length >= 24} onClick={() => { addToBoard(board.id, [photo]); setBoardPhoto(null); }}><FiGrid /><span>{board.name || "Untitled moodboard"}<small>{board.items.length}/24 photos</small></span><FiPlus /></button>)}</div>
    <form className="collection-form" onSubmit={(event) => { event.preventDefault(); newBoard(name, [photo]); notify(`Added to ${name.trim()}`); setBoardPhoto(null); }}><label htmlFor="quick-board-name">Create a new moodboard</label><input id="quick-board-name" placeholder="e.g. Website project" maxLength={60} required value={name} onChange={(event) => setName(event.target.value)} /><div className="dialog-footer"><button className="button" disabled={!name.trim()}><FiPlus /> Create & add photo</button></div></form>
  </Dialog>;
}
export function CreativeToolbar() {
  const { navigate } = useContext(ContextApp);
  const { setEditorPickerOpen, setComparisonOpen, setActiveBoardId, setBoardCreatorOpen } = useContext(StudioContext);
  const tools = [
    { id: "edit", label: "Edit a photo", mobileLabel: "Edit photo", description: "Crop, adjust, and add text", icon: FiEdit2, onClick: () => setEditorPickerOpen(true) },
    { id: "board", label: "Create a moodboard", mobileLabel: "Moodboard", description: "Arrange photos your way", icon: FiGrid, onClick: () => { setActiveBoardId(null); setBoardCreatorOpen(true); navigate("moodboards"); } },
    { id: "compare", label: "Compare photos", mobileLabel: "Compare", description: "Find your favorite side by side", icon: FiColumns, onClick: () => setComparisonOpen(true) },
  ];
  return <div className="tool-cards" role="group" aria-label="Photo tools">{tools.map(({ id, label, mobileLabel, description, icon: Icon, onClick }) => <button className={`tool-card tool-card-${id}`} key={id} onClick={onClick} aria-label={label}>
    <span className={`tool-preview tool-preview-${id}`} aria-hidden="true"><span className="preview-photo" /><span className="preview-photo" /><span className="preview-photo" /><span className="preview-controls"><i /><i /><i /></span></span>
    <span className="tool-card-copy"><strong><Icon aria-hidden="true" /><span className="tool-label-desktop">{label}</span><span className="tool-label-mobile">{mobileLabel}</span></strong><span>{description}</span></span><FiArrowRight className="tool-card-arrow" aria-hidden="true" />
  </button>)}</div>;
}
export default function StudioOverlays() {
  const { actionPhoto, boardPhoto, editorPhoto, editorPickerOpen, setEditorPickerOpen, setEditorPhoto, comparisonOpen } = useContext(StudioContext);
  return <>{actionPhoto && <PhotoActions />}{boardPhoto && <BoardPicker />}{comparisonOpen && <Comparison />}{editorPhoto && <Editor key={editorPhoto.id} />}
    {editorPickerOpen && <PhotoPicker title="Choose a photo to edit" multiple={false} onChoose={(photos) => setEditorPhoto(photos[0])} onClose={() => setEditorPickerOpen(false)} />}
  </>;
}
