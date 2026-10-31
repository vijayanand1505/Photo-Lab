import { useRef, useState } from "react";
import { FiCheck, FiCopy, FiShare2, FiX } from "react-icons/fi";
import { photoSource } from "../../utils/Api";
import { photoShareUrl } from "../../utils/sharing";
import Dialog from "./Dialog";

export default function SharePhoto({ photo, onClose }) {
  const link = photoShareUrl(photo.id);
  const input = useRef(null);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const copyLink = async () => {
    setCopied(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setFeedback("Link copied. Anyone with this link can open the photo in Photo Lab.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setFeedback("Couldn't copy automatically. The link is selected; copy it using your device's copy command.");
    }
  };
  const share = async () => {
    setBusy(true);
    setFeedback("");
    try {
      await navigator.share({ title: "Photo Lab", text: `Photo by ${photo.photographer || "a Pexels photographer"} on Photo Lab`, url: link });
    } catch (error) {
      if (error.name !== "AbortError") setFeedback("Sharing isn't available right now. Copy the link instead.");
    } finally { setBusy(false); }
  };

  return <Dialog onClose={onClose} labelledBy="share-photo-title" describedBy="share-photo-description" className="small-dialog share-photo-dialog">
    <div className="dialog-heading"><span className="eyebrow">Photo Lab</span><button className="icon-button" aria-label="Close photo sharing" onClick={onClose}><FiX /></button></div>
    <h2 id="share-photo-title">Share photo</h2>
    <p className="muted" id="share-photo-description">Send a Photo Lab link. Your recipient can view, save, or download this photo here.</p>
    <div className="picker-photo"><img src={photoSource(photo, 150)} alt="" /><span>{photo.alt || "Selected photo"}<small>by {photo.photographer || "Unknown photographer"} / Pexels</small></span></div>
    <label className="share-link-label" htmlFor="photo-share-link">Photo link</label>
    <input ref={input} id="photo-share-link" className="share-link-input" value={link} readOnly onFocus={(event) => event.target.select()} />
    <div className="share-photo-actions">
      <button className="button" onClick={copyLink}>{copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}{copied ? "Link copied" : "Copy link"}</button>
      {typeof navigator.share === "function" && <button className="button button-secondary" onClick={share} disabled={busy}><FiShare2 aria-hidden="true" />{busy ? "Opening sharing…" : "Share via…"}</button>}
    </div>
    <p className="share-feedback" role="status" aria-live="polite">{feedback}</p>
    <p className="muted">Shares the original photo. Your edits, favorites, and collections stay in your browser.</p>
  </Dialog>;
}

export function SharedPhotoStatus({ status, onClose, onRetry }) {
  return <Dialog onClose={onClose} labelledBy="shared-photo-title" className="small-dialog">
    <div className="dialog-heading"><span className="eyebrow">Photo Lab</span><button className="icon-button" aria-label="Close shared photo" onClick={onClose}><FiX /></button></div>
    <h2 id="shared-photo-title">{status.loading ? "Opening shared photo" : "Shared photo unavailable"}</h2>
    {status.loading ? <p className="shared-photo-loading" role="status"><span className="spinner" /> Loading photo…</p> : <>
      <p className="muted" role="alert">{status.error}</p>
      <div className="dialog-footer"><button className="button button-secondary" onClick={onClose}>Browse photos</button>{status.canRetry && <button className="button" onClick={onRetry}>Retry shared photo</button>}</div>
    </>}
  </Dialog>;
}
