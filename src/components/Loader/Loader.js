export default function Loader({ count = 8 }) {
  return <div role="status" className="loading-grid" aria-label="Loading photos" aria-live="polite">
    <span className="sr-only">Loading photos…</span>
    {Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index} style={{ aspectRatio: ["3 / 4", "4 / 3", "3 / 5", "1 / 1"][index % 4] }} />)}
  </div>;
}
