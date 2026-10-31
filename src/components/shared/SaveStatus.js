import { FiCheck, FiAlertCircle } from "react-icons/fi";

export default function SaveStatus({ status, savedLabel = "Saved in this browser" }) {
  return <p className={`draft-note save-status save-status-${status}`} role="status" aria-live="polite" aria-atomic="true">
    {status === "saving" ? <span className="spinner" aria-hidden="true" /> : status === "temporary" ? <FiAlertCircle aria-hidden="true" /> : <FiCheck aria-hidden="true" />}
    {status === "saving" ? "Saving…" : status === "temporary" ? "Not saved · Available for this visit only" : savedLabel}
  </p>;
}
