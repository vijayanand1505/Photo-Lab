import { useContext } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import Banner from "../../components/Banner/Banner";
import CardContainer from "../../components/CardContainer/CardContainer";
import Filters from "../../components/Filters/Filters";
import Collections from "../../components/Collections/Collections";
import Moodboards from "../../components/Studio/Moodboards";
import { CreativeToolbar } from "../../components/Studio/StudioOverlays";

export default function Home() {
  const { view, query, images, total, loading } = useContext(ContextApp);
  if (view === "moodboards") return <Moodboards />;
  if (view === "collections") return <Collections />;
  if (view === "favorites") return <section className="library shell" aria-labelledby="favorites-title">
    <div className="section-heading library-heading"><div><h1 id="favorites-title">Favorites</h1><p className="muted">{images.length} {images.length === 1 ? "photo" : "photos"} saved.</p></div></div>
    <CardContainer /><p className="storage-note">Your favorites are saved in this browser. No account needed.</p>
  </section>;
  return <><Banner /><section className="gallery shell" aria-labelledby="gallery-title">
    <CreativeToolbar />
    <div className="section-heading gallery-heading"><div><h2 id="gallery-title">{query ? <>Results for “{query}”</> : "Photos"}</h2><p className="muted" aria-live="polite">{loading && images.length === 0 ? "Loading photos…" : total !== null ? `${total.toLocaleString()} photos available` : "Browse photos from Pexels."}</p></div>
      <a className="photo-provider" href="https://www.pexels.com" target="_blank" rel="noreferrer"><span className="provider-label">Photography by</span><strong>Pexels</strong><FiArrowUpRight aria-hidden="true" /></a></div>
    <Filters /><CardContainer showTools={false} />
  </section></>;
}
