import { useContext, useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowUpRight, FiCheck, FiCopy, FiCrosshair, FiDownload, FiGrid, FiLayers, FiMaximize, FiMove, FiPlus, FiSliders, FiTrash2, FiX, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { StudioContext } from "./StudioContext";
import { photoSource } from "../../utils/Api";
import Dialog from "../shared/Dialog";
import PhotoPicker from "./PhotoPicker";
import CreatorCredit from "../shared/CreatorCredit";
import SaveStatus from "../shared/SaveStatus";
import Tooltip from "../shared/Tooltip";
import useExportFeedback from "./useExportFeedback";
import { HistoryButtons, RangeControl } from "./Editor";
import useHistory, { historyShortcut } from "./useHistory";
import { addBoardPhotos, boundItem, clamp, layoutBoard, uid } from "./model";
import { exportBoard, saveBlob } from "./canvas";
import useCanvasView from "./useCanvasView";
import { alignItem } from "./alignment";

function BoardWorkspace({ board: initial, onDelete }) {
  const { updateBoard, setActiveBoardId, setEditorPhoto, boardsSaveStatus, registerBoardEditor, restoreBoardItem } = useContext(StudioContext);
  const exportFeedback = useExportFeedback();
  const { notify, offerUndo } = useContext(ContextApp);
  const canvasView = useCanvasView();
  const history = useHistory(initial);
  const board = history.value;
  const [selectedId, setSelectedId] = useState(null);
  const [picker, setPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [snapping, setSnapping] = useState(true);
  const [guides, setGuides] = useState({ x: [], y: [] });
  const stage = useRef(null);
  const inspector = useRef(null);
  const drag = useRef(null);
  const exportController = useRef(null);
  const selected = board.items.find((item) => item.id === selectedId);
  useEffect(() => { updateBoard(board); }, [board, updateBoard]);
  useEffect(() => registerBoardEditor(board.id, history.set), [board.id, history.set, registerBoardEditor]);
  useEffect(() => () => exportController.current?.abort(), []);

  const changeItem = (patch) => history.set((previous) => ({ ...previous, layout: "freeform", items: previous.items.map((item) => item.id === selectedId ? boundItem({ ...item, ...patch }, previous) : item) }));
  const removeSelected = () => {
    if (!selected) return;
    const removed = selected, index = board.items.findIndex((item) => item.id === selected.id);
    history.set((previous) => ({ ...previous, items: previous.items.filter((item) => item.id !== selectedId) }));
    offerUndo("Photo removed from moodboard", () => restoreBoardItem(board.id, removed, index));
    setSelectedId(null); stage.current?.focus({ preventScroll: true });
  };
  const duplicateSelected = () => {
    if (!selected || board.items.length >= 24) return;
    const id = uid();
    history.set((previous) => ({ ...previous, items: [...previous.items, boundItem({ ...selected, id, x: selected.x + 30, y: selected.y + 30 }, previous)] })); setSelectedId(id);
  };
  const centerSelected = () => { if (selected) changeItem({ x: (board.width - selected.width) / 2, y: (board.height - selected.height) / 2 }); };
  const showSettings = () => {
    inspector.current?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    inspector.current?.querySelector("input")?.focus({ preventScroll: true });
  };
  const startDrag = (event, item, mode) => {
    if (event.button !== 0 || canvasView.panning) return;
    event.stopPropagation(); event.preventDefault();
    setSelectedId(item.id); event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    history.begin();
    drag.current = { id: item.id, pointer: event.pointerId, mode, item, x: event.clientX, y: event.clientY, scale: board.width / stage.current.getBoundingClientRect().width };
  };
  const moveDrag = (event) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointer) return;
    const dx = (event.clientX - current.x) * current.scale;
    const dy = (event.clientY - current.y) * current.scale;
    const patch = current.mode === "move" ? { x: current.item.x + dx, y: current.item.y + dy } : {
      width: clamp(current.item.width + dx, 80, board.width - current.item.x), height: clamp(current.item.height + dy, 80, board.height - current.item.y),
    };
    const candidate = boundItem({ ...current.item, ...patch }, board);
    const result = snapping ? alignItem(candidate, board, 8 * current.scale, current.mode) : { item: candidate, guides: { x: [], y: [] } };
    setGuides(result.guides);
    history.set((previous) => ({ ...previous, layout: "freeform", items: previous.items.map((item) => item.id === current.id ? result.item : item) }));
  };
  const finishDrag = () => { if (drag.current) { drag.current = null; history.commit(); setGuides({ x: [], y: [] }); } };
  const itemKey = (event, item) => {
    const step = event.shiftKey ? 40 : 10;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (delta) {
      event.preventDefault(); event.stopPropagation();
      history.set((previous) => ({ ...previous, layout: "freeform", items: previous.items.map((entry) => entry.id === item.id ? boundItem({ ...entry, x: entry.x + delta[0], y: entry.y + delta[1] }, previous) : entry) }));
    }
  };
  const download = async () => {
    if (exporting || !board.items.length) return;
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true); setExportError(""); exportFeedback.reset();
    try {
      const blob = await exportBoard(board, controller.signal);
      if (controller.signal.aborted) return;
      saveBlob(blob, `${board.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "moodboard"}.png`);
      exportFeedback.confirm();
      notify("Moodboard exported.", "success");
    } catch (error) { if (!controller.signal.aborted) { setExportError(error.message); controller.abort(); } }
    finally { if (exportController.current === controller) { exportController.current = null; setExporting(false); } }
  };
  const layer = (direction) => history.set((previous) => {
    const items = [...previous.items];
    const index = items.findIndex((item) => item.id === selectedId);
    const target = Math.min(items.length - 1, Math.max(0, index + direction));
    [items[index], items[target]] = [items[target], items[index]];
    return { ...previous, items };
  });
  return <section className="board-workspace shell" aria-labelledby="board-workspace-title" onKeyDown={(event) => {
    historyShortcut(event, history);
    if (selected && ["Delete", "Backspace"].includes(event.key) && !["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) { event.preventDefault(); removeSelected(); }
  }}>
    <button className="text-button back-link" onClick={() => setActiveBoardId(null)}><FiArrowLeft /> All moodboards</button>
    <div className="board-heading"><div><span className="eyebrow">Moodboard</span><h1 id="board-workspace-title" className="sr-only">Moodboard builder</h1><input className="board-title-input" aria-label="Moodboard name" value={board.name} maxLength={60} onChange={(event) => history.set((previous) => ({ ...previous, name: event.target.value }))} onBlur={() => { if (!board.name.trim()) history.set((previous) => ({ ...previous, name: "Untitled moodboard" })); }} /><SaveStatus status={boardsSaveStatus} savedLabel="Saved automatically in this browser" /></div>
      <div className="board-heading-actions"><HistoryButtons history={history} /><Tooltip label="Delete this board and its layout"><button className="icon-button danger" aria-label="Delete this moodboard" onClick={() => onDelete(board)}><FiTrash2 /></button></Tooltip><button className={`button ${exportFeedback.exported ? "export-confirmed" : ""}`} onClick={download} disabled={!board.items.length || exporting}>{exporting ? <span className="spinner" /> : exportFeedback.exported ? <FiCheck aria-hidden="true" /> : <FiDownload aria-hidden="true" />}{exporting ? "Exporting…" : exportFeedback.exported ? "PNG exported" : "Export PNG"}</button></div></div>
    <div className="board-toolbar"><button className="button button-small" onClick={() => setPicker(true)} disabled={board.items.length >= 24}><FiPlus /> Add photos</button>
      <label className="board-layout-control">Layout<select aria-label="Moodboard layout" value={board.layout} onChange={(event) => history.set((previous) => layoutBoard(previous, event.target.value))}><option value="freeform">Freeform</option><option value="grid">Grid</option><option value="collage">Collage</option></select></label>
      <label className="studio-color-field">Background<input type="color" aria-label="Moodboard background" value={board.background} onChange={(event) => history.set((previous) => ({ ...previous, background: event.target.value }))} /></label>
      <label className="board-credit-toggle"><input type="checkbox" checked={board.credits} onChange={(event) => history.set((previous) => ({ ...previous, credits: event.target.checked }))} /> Include photo credits</label><span className="board-item-count">{board.items.length}/24 photos</span>
    </div>
    <div className="board-body"><div className="board-canvas-column">
      <div className="canvas-view-controls" role="group" aria-label="Canvas view controls">
        <button className="icon-button" aria-label="Zoom out" disabled={canvasView.zoom <= 1} onClick={() => canvasView.changeZoom(canvasView.zoom - .25)}><FiZoomOut aria-hidden="true" /></button>
        <output aria-live="polite" aria-label="Canvas zoom">{Math.round(canvasView.zoom * 100)}%</output>
        <button className="icon-button" aria-label="Zoom in" disabled={canvasView.zoom >= 3} onClick={() => canvasView.changeZoom(canvasView.zoom + .25)}><FiZoomIn aria-hidden="true" /></button>
        <button className="canvas-control" aria-label="Fit canvas to screen" onClick={canvasView.fit}><FiMaximize aria-hidden="true" /> Fit</button>
        <button className="canvas-control" aria-label="Pan canvas" aria-pressed={canvasView.panning} onClick={() => canvasView.setPanning((value) => !value)}><FiMove aria-hidden="true" /> Pan</button>
        <button className="canvas-control" aria-label="Snap to alignment guides" aria-pressed={snapping} onClick={() => { setSnapping((value) => !value); setGuides({ x: [], y: [] }); }}><FiCrosshair aria-hidden="true" /> Snap</button>
      </div>
      <p className="canvas-view-hint" aria-live="polite">{canvasView.panning ? "Pan mode: drag to move around the canvas." : "Select a photo to move it. Zoom in for finer adjustments."}</p>
      <div ref={canvasView.viewport} className={`board-scroll ${canvasView.panning ? "is-panning" : ""}`} role="region" aria-label="Scrollable moodboard canvas" tabIndex={0} style={{ touchAction: canvasView.panning ? "none" : "auto" }} {...canvasView.panHandlers}>
      <div className="board-viewport" style={{ width: `${canvasView.zoom * 100}%` }}><div ref={stage} className="board-stage" style={{ aspectRatio: `${board.width}/${board.height}`, background: board.background }} role="group" aria-label="Moodboard canvas. Select a photo and use arrow keys to move it." tabIndex={0}
      onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
      {board.items.map((item) => <div className={`board-item ${selectedId === item.id ? "is-selected" : ""}`} key={item.id} style={{ left: `${item.x / board.width * 100}%`, top: `${item.y / board.height * 100}%`, width: `${item.width / board.width * 100}%`, height: `${item.height / board.height * 100}%` }}>
        <button className="board-item-surface" aria-label={`Move ${item.photo.alt || `photo by ${item.photo.photographer}`}`} aria-pressed={selectedId === item.id} onFocus={() => setSelectedId(item.id)} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => itemKey(event, item)}
          onPointerDown={(event) => startDrag(event, item, "move")} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
          <img src={photoSource(item.photo, 900)} alt="" draggable="false" style={{ objectFit: item.fit }} />
        </button>
        {selectedId === item.id && <button className="board-resize" aria-label={`Resize ${item.photo.alt || item.photo.photographer}`} title="Drag to resize, or use the size controls" onPointerDown={(event) => startDrag(event, item, "resize")} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}><FiMaximize /></button>}
      </div>)}
      {guides.x.map((x) => <span className="board-guide board-guide-x" aria-hidden="true" key={`x-${x}`} style={{ left: `${x / board.width * 100}%` }} />)}
      {guides.y.map((y) => <span className="board-guide board-guide-y" aria-hidden="true" key={`y-${y}`} style={{ top: `${y / board.height * 100}%` }} />)}
      {!board.items.length && <div className="board-empty"><div className="board-empty-content"><FiGrid aria-hidden="true" /><h2>No photos added.</h2><p>Choose photos from the gallery, then drag them into place.</p><button className="button" onClick={() => setPicker(true)}><FiPlus /> Add your first photos</button></div></div>}
    </div>{board.credits && board.items.length > 0 && <div className="board-credits"><strong>{board.name || "Untitled moodboard"} · Photo Lab</strong><span>Photography: {[...new Set(board.items.map((item) => item.photo.photographer))].join(" · ")} / Pexels</span><CreatorCredit /></div>}</div></div>
      {selected && <div className="board-selection-toolbar" role="group" aria-label="Selected photo actions">
        <button onClick={centerSelected} aria-label="Center selected photo"><FiCrosshair aria-hidden="true" /><span>Center</span></button>
        <button onClick={duplicateSelected} disabled={board.items.length >= 24} aria-label="Duplicate selected photo"><FiCopy aria-hidden="true" /><span>Duplicate</span></button>
        <button onClick={removeSelected} className="danger" aria-label="Remove selected photo"><FiTrash2 aria-hidden="true" /><span>Remove</span></button>
        <button onClick={showSettings} aria-label="Open selected photo settings"><FiSliders aria-hidden="true" /><span>Settings</span></button>
      </div>}
      <div className="board-canvas-caption"><span>1600 × {1000 + (board.credits && board.items.length ? 100 : 0)} px export</span><span>Drag to move · Corner to resize · Arrow keys to move</span></div>
      {exporting && <button className="text-button" onClick={() => exportController.current?.abort()}>Cancel export</button>}{exportError && <p className="inline-error" role="alert">{exportError} You can retry using Export PNG.</p>}
    </div>
    <aside ref={inspector} className="board-inspector">{selected ? <><span className="eyebrow">Selected photo</span><h2>Photo settings</h2><p className="muted">by {selected.photo.photographer}</p>
      <RangeControl label="Photo width" value={selected.width} min={80} max={board.width} unit=" px" onChange={(width) => changeItem({ width })} history={history} /><RangeControl label="Photo height" value={selected.height} min={80} max={board.height} unit=" px" onChange={(height) => changeItem({ height })} history={history} />
      <RangeControl label="Photo left" value={selected.x} max={board.width - selected.width} unit=" px" onChange={(x) => changeItem({ x })} history={history} /><RangeControl label="Photo top" value={selected.y} max={board.height - selected.height} unit=" px" onChange={(y) => changeItem({ y })} history={history} />
      <label className="studio-field">Image fit<select aria-label="Moodboard image fit" value={selected.fit} onChange={(event) => changeItem({ fit: event.target.value })}><option value="cover">Fill photo frame</option><option value="contain">Show full photo</option></select></label>
      <div className="board-item-tools"><button className="button button-small button-secondary" onClick={centerSelected}>Center photo</button><button className="button button-small button-secondary" onClick={() => layer(1)}>Bring forward</button><button className="button button-small button-secondary" onClick={() => layer(-1)}>Send backward</button>
        <button className="button button-small button-secondary" disabled={board.items.length >= 24} onClick={duplicateSelected}><FiCopy /> Duplicate</button><button className="button button-small button-secondary" onClick={() => setEditorPhoto(selected.photo)}>Edit source photo</button><button className="button button-small button-secondary danger" onClick={removeSelected}><FiTrash2 /> Remove photo</button></div>
    </> : <div className="inspector-empty"><FiLayers aria-hidden="true" /><h2>Photo settings</h2><p>Select a photo to change its position, size, or layer order.</p><p>Use the Layout menu to arrange all photos at once.</p></div>}</aside></div>
    {picker && <PhotoPicker title="Add photos to your moodboard" limit={24 - board.items.length} onChoose={(photos) => history.set((previous) => addBoardPhotos(previous, photos))} onClose={() => setPicker(false)} />}
  </section>;
}

export default function Moodboards() {
  const { boards, activeBoard, setActiveBoardId, newBoard, deleteBoard, boardCreatorOpen: creating, setBoardCreatorOpen: setCreating } = useContext(StudioContext);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState(null);
  return <>{activeBoard ? <BoardWorkspace key={activeBoard.id} board={activeBoard} onDelete={setDeleting} /> : <section className="library shell" aria-labelledby="moodboards-title">
    <div className="section-heading library-heading"><div><h1 id="moodboards-title">Moodboards</h1><p className="muted">Arrange photos on a board and export the result as an image.</p></div><button className="button" onClick={() => setCreating(true)}><FiPlus /> New moodboard</button></div>
    {boards.length ? <div className="collections-grid">{boards.map((board) => <article className="collection-card moodboard-card" key={board.id}>
      <button className="collection-cover-button" onClick={() => setActiveBoardId(board.id)} aria-label={`Open moodboard ${board.name}`}><div className="moodboard-mini" style={{ background: board.background, aspectRatio: "1.6" }}>{board.items.map((item) => <img key={item.id} src={photoSource(item.photo, 320)} alt="" loading="lazy" style={{ left: `${item.x / board.width * 100}%`, top: `${item.y / board.height * 100}%`, width: `${item.width / board.width * 100}%`, height: `${item.height / board.height * 100}%`, objectFit: item.fit }} />)}{!board.items.length && <FiGrid aria-hidden="true" />}</div><div className="collection-card-title"><h2>{board.name || "Untitled moodboard"}</h2><FiArrowUpRight /></div><p className="muted">{board.items.length} photos · {board.layout}</p></button>
      <div className="collection-card-tools"><button className="icon-button danger" aria-label={`Delete moodboard ${board.name}`} onClick={() => setDeleting(board)}><FiTrash2 /></button></div>
    </article>)}</div> : <div className="empty-state"><span className="empty-icon"><FiGrid /></span><h3>No moodboards yet</h3><p>Create a moodboard, then add and arrange photos.</p><button className="button" onClick={() => setCreating(true)}><FiPlus /> Create your first moodboard</button></div>}
    <p className="storage-note">Moodboards are saved in this browser. Export a PNG to share your work.</p>
  </section>}
    {creating && <Dialog onClose={() => setCreating(false)} labelledBy="new-board-title" className="small-dialog studio-small-dialog"><div className="dialog-heading"><span className="eyebrow">Moodboards</span><button className="icon-button" onClick={() => setCreating(false)} aria-label="Close new moodboard form"><FiX /></button></div><h2 id="new-board-title">New moodboard</h2><form className="collection-form" onSubmit={(event) => { event.preventDefault(); const id = newBoard(name); setCreating(false); setName(""); setActiveBoardId(id); }}><label htmlFor="new-board-name">Moodboard name</label><input id="new-board-name" data-autofocus value={name} maxLength={60} placeholder="e.g. Travel plans" onChange={(event) => setName(event.target.value)} required /><div className="dialog-footer"><button className="button" disabled={!name.trim()}>Create moodboard</button></div></form></Dialog>}
    {deleting && <Dialog onClose={() => setDeleting(null)} labelledBy="delete-board-title" className="small-dialog studio-small-dialog"><div className="dialog-heading"><span className="eyebrow">Moodboards</span><button className="icon-button" onClick={() => setDeleting(null)} aria-label="Close moodboard delete confirmation"><FiX /></button></div><h2 id="delete-board-title">Delete “{deleting.name}”?</h2><p className="muted">This removes the moodboard and its arrangement. Your favorites and collections stay saved.</p><div className="dialog-footer"><button className="button button-secondary" data-autofocus onClick={() => setDeleting(null)}>Keep moodboard</button><button className="button button-danger" onClick={() => { deleteBoard(deleting.id); setDeleting(null); }}>Delete moodboard</button></div></Dialog>}
  </>;
}
