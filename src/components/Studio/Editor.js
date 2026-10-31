import { useContext, useEffect, useRef, useState } from "react";
import { FiCheck, FiCrop, FiDownload, FiRefreshCw, FiRotateCcw, FiRotateCw, FiSliders, FiType, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { StudioContext } from "./StudioContext";
import { photoSource } from "../../utils/Api";
import Dialog from "../shared/Dialog";
import CreatorCredit from "../shared/CreatorCredit";
import SaveStatus from "../shared/SaveStatus";
import Tooltip from "../shared/Tooltip";
import useExportFeedback from "./useExportFeedback";
import useHistory, { historyShortcut } from "./useHistory";
import { clamp, cropToRatio, DEFAULT_EDIT, editGeometry } from "./model";
import { canvasBlob, loadCanvasImage, renderEdit, saveBlob } from "./canvas";

export function HistoryButtons({ history }) {
  return <div className="history-buttons"><Tooltip label="Undo (Ctrl/Cmd+Z)"><button className="icon-button" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo"><FiRotateCcw /></button></Tooltip><Tooltip label="Redo (Ctrl/Cmd+Shift+Z)"><button className="icon-button" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo"><FiRotateCw /></button></Tooltip></div>;
}
export function RangeControl({ label, value, min = 0, max = 100, onChange, history, unit = "%", step = 1 }) {
  return <label className="studio-range"><span>{label}<output>{Math.round(value)}{unit}</output></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value}
    onPointerDown={history.begin} onPointerUp={history.commit} onPointerCancel={history.commit} onBlur={history.commit} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export default function Editor() {
  const { notify } = useContext(ContextApp);
  const { editorPhoto: photo, setEditorPhoto, drafts, saveDraft, draftsSaveStatus } = useContext(StudioContext);
  const exportFeedback = useExportFeedback();
  const history = useHistory(drafts[photo.id] || DEFAULT_EDIT);
  const edit = history.value;
  const [tab, setTab] = useState("adjust");
  const [image, setImage] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [format, setFormat] = useState("png");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const canvas = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { saveDraft(photo.id, edit); }, [photo.id, edit, saveDraft]);
  useEffect(() => {
    const controller = new AbortController();
    setImage(null); setLoadError(""); setRenderError("");
    loadCanvasImage(photoSource(photo, 2400), controller.signal).then((loaded) => { if (!controller.signal.aborted) setImage(loaded); }).catch((error) => { if (error.name !== "AbortError") setLoadError(error.message); });
    return () => controller.abort();
  }, [photo, attempt]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const frame = requestAnimationFrame(() => {
      try { renderEdit(canvas.current, image, showOriginal ? DEFAULT_EDIT : edit); setRenderError(""); }
      catch { setRenderError("This photo couldn't be rendered. Try loading it again or choose another photo."); }
    });
    return () => cancelAnimationFrame(frame);
  }, [image, edit, showOriginal]);
  const change = (key, value) => { setShowOriginal(false); history.set((previous) => ({ ...previous, [key]: value })); };
  const cropChange = (key, value) => { setShowOriginal(false); history.set((previous) => {
    const crop = { ...previous.crop, [key]: value };
    crop.width = clamp(crop.width, 10, 100); crop.height = clamp(crop.height, 10, 100);
    crop.x = clamp(crop.x, 0, 100 - crop.width); crop.y = clamp(crop.y, 0, 100 - crop.height);
    return { ...previous, crop };
  }); };
  const geometry = editGeometry(image?.naturalWidth || photo.width, image?.naturalHeight || photo.height, edit);
  const sourceCropRatio = ((image?.naturalWidth || photo.width) * edit.crop.width) / ((image?.naturalHeight || photo.height) * edit.crop.height);
  const cropRatio = edit.rotation % 180 ? 1 / sourceCropRatio : sourceCropRatio;
  const cropPreset = edit.crop.width === 100 && edit.crop.height === 100 ? "0" : ["1", "0.8", "1.7777777778"].find((ratio) => Math.abs(Number(ratio) - cropRatio) < .001) || "custom";
  const exportPhoto = async () => {
    if (!image || exporting) return;
    setExporting(true); setExportError(""); exportFeedback.reset();
    try {
      const output = document.createElement("canvas");
      renderEdit(output, image, edit, 2400);
      const blob = await canvasBlob(output, format === "png" ? "image/png" : "image/jpeg");
      if (!mounted.current) return;
      saveBlob(blob, `photo-lab-edit-${photo.id}.${format === "png" ? "png" : "jpg"}`);
      exportFeedback.confirm();
      notify("Edited photo exported.", "success");
    } catch (error) { if (mounted.current) setExportError(error.message); }
    finally { if (mounted.current) setExporting(false); }
  };
  return <Dialog onClose={() => setEditorPhoto(null)} labelledBy="editor-title" className="editor-dialog" onKeyDown={(event) => historyShortcut(event, history)}>
    <header className="studio-dialog-header"><div><span className="eyebrow">Photo Lab</span><h2 id="editor-title">Photo editor</h2></div><div className="studio-header-actions"><HistoryButtons history={history} /><button className="icon-button" data-autofocus onClick={() => setEditorPhoto(null)} aria-label="Close photo editor"><FiX /></button></div></header>
    <div className="editor-body"><div className="editor-stage"><div className="editor-preview">
      {!image && !loadError && <p role="status"><span className="spinner" /> Loading photo…</p>}
      {(loadError || renderError) && <div className="studio-error" role="alert"><p>{loadError || renderError}</p><button className="button button-secondary" onClick={() => setAttempt((value) => value + 1)}><FiRefreshCw /> Reload photo</button></div>}
      <canvas ref={canvas} className={!image || renderError ? "canvas-hidden" : ""} aria-label={`Edited preview of ${photo.alt || "your photo"}`} role="img" />
    </div><div className="editor-preview-footer"><button className={`button button-small button-secondary ${showOriginal ? "selected" : ""}`} aria-pressed={showOriginal} onClick={() => setShowOriginal((value) => !value)} disabled={!image}>Show original</button><span>{geometry.width} × {geometry.height} px export</span></div></div>
    <aside className="editor-controls"><div className="editor-tabs" aria-label="Editing tools">{[{ id: "adjust", label: "Adjust", icon: FiSliders }, { id: "crop", label: "Crop", icon: FiCrop }, { id: "text", label: "Text", icon: FiType }].map(({ id, label, icon: Icon }) =>
      <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setShowOriginal(false); }}><Icon aria-hidden="true" />{label}</button>)}</div>
      <div className="editor-control-content">{tab === "adjust" && <><h3>Image adjustments</h3><p className="muted">Adjust brightness, contrast, and color.</p>
        {["brightness", "contrast", "saturation"].map((key) => <RangeControl key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={edit[key]} max={200} onChange={(value) => change(key, value)} history={history} />)}
        <div className="editor-presets"><button className="button button-small button-secondary" onClick={() => { setShowOriginal(false); history.set((previous) => ({ ...previous, brightness: 100, contrast: 100, saturation: 0 })); }}>Black & white</button><button className="button button-small button-secondary" onClick={() => { setShowOriginal(false); history.set((previous) => ({ ...previous, brightness: 108, contrast: 88, saturation: 85 })); }}>Soft light</button></div>
      </>}{tab === "crop" && <><h3>Crop and rotate</h3><label className="studio-field">Crop ratio<select aria-label="Crop ratio" value={cropPreset} onChange={(event) => change("crop", cropToRatio(image?.naturalWidth || photo.width, image?.naturalHeight || photo.height, (edit.rotation % 180 && Number(event.target.value)) ? 1 / Number(event.target.value) : Number(event.target.value)))}><option value="0">Original / reset crop</option><option value="1">Square · 1:1</option><option value="0.8">Portrait · 4:5</option><option value="1.7777777778">Landscape · 16:9</option><option value="custom" disabled>Custom crop</option></select></label>
        <div className="transform-buttons"><button className="button button-secondary" onClick={() => change("rotation", (edit.rotation + 90) % 360)}><FiRotateCw /> Rotate 90°</button><button className="button button-secondary" aria-pressed={edit.flipX} onClick={() => change("flipX", !edit.flipX)}>Flip horizontal</button></div>
        <RangeControl label="Crop width" min={10} value={edit.crop.width} onChange={(value) => cropChange("width", value)} history={history} /><RangeControl label="Crop height" min={10} value={edit.crop.height} onChange={(value) => cropChange("height", value)} history={history} />
        <RangeControl label="Crop left" max={Math.max(0, 100 - edit.crop.width)} value={edit.crop.x} onChange={(value) => cropChange("x", value)} history={history} /><RangeControl label="Crop top" max={Math.max(0, 100 - edit.crop.height)} value={edit.crop.y} onChange={(value) => cropChange("y", value)} history={history} />
      </>}{tab === "text" && <><h3>Add text</h3><label className="studio-field">Text<textarea aria-label="Overlay text" placeholder="Enter your text" maxLength={120} rows={3} value={edit.text} onChange={(event) => change("text", event.target.value)} /></label><p className="muted">Up to 3 lines, 120 characters.</p>
        <label className="studio-color-field">Text color<input type="color" aria-label="Text color" value={edit.textColor} onChange={(event) => change("textColor", event.target.value)} /></label>
        <RangeControl label="Text size" min={2} max={15} value={edit.textSize} onChange={(value) => change("textSize", value)} history={history} />
        <RangeControl label="Text horizontal position" min={5} max={95} value={edit.textX} onChange={(value) => change("textX", value)} history={history} /><RangeControl label="Text vertical position" min={5} max={95} value={edit.textY} onChange={(value) => change("textY", value)} history={history} />
      </>}</div>
      <div className="editor-export"><button className="text-button" onClick={() => { history.set(DEFAULT_EDIT); setShowOriginal(false); }}><FiRefreshCw aria-hidden="true" /> Reset all edits</button><label className="studio-field">Export format<select aria-label="Export format" value={format} onChange={(event) => setFormat(event.target.value)}><option value="png">PNG · lossless</option><option value="jpeg">JPEG · smaller file</option></select></label><button className={`button ${exportFeedback.exported ? "export-confirmed" : ""}`} onClick={exportPhoto} disabled={!image || Boolean(renderError) || exporting}>{exporting ? <span className="spinner" /> : exportFeedback.exported ? <FiCheck aria-hidden="true" /> : <FiDownload aria-hidden="true" />}{exporting ? "Exporting…" : exportFeedback.exported ? "Photo exported" : "Export edited photo"}</button>
        {exportError && <p className="inline-error" role="alert">{exportError}</p>}<SaveStatus status={draftsSaveStatus} savedLabel="Edits saved in this browser · Up to 2400 px" /><CreatorCredit className="studio-creator-credit" /></div>
    </aside></div>
  </Dialog>;
}
