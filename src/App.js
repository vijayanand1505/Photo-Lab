import { useContext } from "react";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiDownload, FiX } from "react-icons/fi";
import "./App.scss";
import Header from "./components/Header/Header";
import LightBox from "./components/LightBox/LightBox";
import Home from "./pages/Home/Home";
import { ContextApp } from "./utils/Context";
import Footer from "./components/Footer/Footer";
import { CollectionPicker } from "./components/Collections/Collections";
import { StudioContext } from "./components/Studio/StudioContext";
import StudioOverlays from "./components/Studio/StudioOverlays";
import { ComparisonDock } from "./components/Studio/Comparison";
import UndoNotice from "./components/shared/UndoNotice";
import useBrowsePosition from "./utils/useBrowsePosition";

export default function App() {
  const { viewer, collectionPhoto, toast, dismissToast, download, cancelDownload, view, collectionId, searchVersion } = useContext(ContextApp);
  const { comparedPhotos, activeBoardId } = useContext(StudioContext);
  useBrowsePosition(view === "explore" ? `explore:${searchVersion}` : view === "collections" ? `collections:${collectionId || "list"}` : view === "moodboards" ? `moodboards:${activeBoardId || "list"}` : view);
  const ToastIcon = toast?.tone === "success" ? FiCheckCircle : toast?.tone === "error" ? FiAlertCircle : FiInfo;
  return <div className={`App ${comparedPhotos.length ? "has-comparison" : ""}`}>
    <a href="#main-content" className="skip-link">Skip to photos</a><Header />
    <main id="main-content" tabIndex={-1}><Home /></main><Footer />
    {viewer && <LightBox />}{collectionPhoto && <CollectionPicker />}
    <StudioOverlays /><ComparisonDock />
    {createPortal(<div className="feedback-stack">
      <UndoNotice />
      {download && <div className="download-status"><div><FiDownload aria-hidden="true" /><span role="status">Downloading photo{download.progress !== null ? ` · ${download.progress}%` : "…"}</span><button className="icon-button" aria-label="Cancel download" onClick={cancelDownload}><FiX /></button></div><progress aria-label="Photo download progress" max="100" value={download.progress === null ? undefined : download.progress} /></div>}
      <div role="status" aria-live="polite" aria-atomic="true">{toast && <div className={`toast toast-${toast.tone}`} key={toast.id}><ToastIcon aria-hidden="true" /><span>{toast.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={dismissToast}><FiX /></button></div>}</div>
    </div>, document.body)}
  </div>;
}
