import { useContext } from "react";
import { FiRotateCcw, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";

export default function UndoNotice() {
  const { undoNotice, undoRemoval, dismissUndo, holdUndo } = useContext(ContextApp);
  if (!undoNotice) return null;
  return <div className="undo-notice" role="status" aria-live="polite" aria-atomic="true"
    onMouseEnter={() => holdUndo("pointer", true)} onMouseLeave={() => holdUndo("pointer", false)}
    onFocusCapture={() => holdUndo("focus", true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) holdUndo("focus", false); }}>
    <FiRotateCcw aria-hidden="true" /><span>{undoNotice.message}</span>
    <button className="undo-action" aria-label="Undo removal" onClick={undoRemoval}>Undo</button>
    <button className="icon-button" aria-label="Dismiss undo notification" onClick={dismissUndo}><FiX /></button>
  </div>;
}
