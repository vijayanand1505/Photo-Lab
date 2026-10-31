import { useContext } from "react";
import { FiArrowDown, FiCompass, FiHeart, FiImage, FiRefreshCw } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import PhotoGrid from "../shared/PhotoGrid";
import Loader from "../Loader/Loader";
import { CreativeToolbar } from "../Studio/StudioOverlays";

export default function CardContainer({ showTools = true }) {
  const { images, loading, error, retry, hasMore, loadMore, view, query, navigate, activeCollection, resetExplore } = useContext(ContextApp);
  return <>
    {showTools && <CreativeToolbar />}
    {images.length > 0 && <PhotoGrid photos={images} />}
    {loading && <Loader count={images.length ? 4 : 8} />}
    {error && <div className="empty-state error-state" role="alert"><span className="empty-icon"><FiRefreshCw /></span>
      <h3>{images.length ? "Couldn't load more photos" : "We couldn't load your photos"}</h3><p>{error}</p>
      <button className="button" onClick={retry}><FiRefreshCw aria-hidden="true" /> Try again</button>
    </div>}
    {!loading && !error && images.length === 0 && <div className="empty-state">
      <span className="empty-icon">{view === "favorites" ? <FiHeart /> : <FiImage />}</span>
      <h3>{view === "favorites" ? "No favorites yet" : activeCollection ? "This collection is empty" : "No photos found"}</h3>
      <p>{view === "favorites" ? "Use the heart button on a photo to save it here." : activeCollection ? "Explore the gallery and use the + button to add photos to this collection." : `We couldn't find photos${query ? ` for “${query}”` : " with these filters"}. Try another search or change the filters.`}</p>
      <button className="button" onClick={() => view === "explore" ? resetExplore() : navigate("explore")}><FiCompass aria-hidden="true" /> {view === "explore" ? "Clear search & filters" : "Explore photos"}</button>
    </div>}
    {!error && images.length > 0 && <div className="gallery-end">
      {hasMore ? <button className="button button-secondary" onClick={loadMore} disabled={loading}>{loading ? <span className="spinner" /> : <FiArrowDown aria-hidden="true" />}{loading ? "Loading…" : "Load more photos"}</button>
        : !loading && <p>{view === "explore" ? "All photos loaded." : "All saved photos are shown."}</p>}
    </div>}
  </>;
}
