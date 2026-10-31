import { useContext, useState } from "react";
import { FiArrowUpRight, FiChevronDown, FiImage, FiSearch, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";

const categories = ["Nature", "Architecture", "Travel", "People", "Interiors", "Abstract"];
export default function Banner() {
  const { draft, setDraft, search, query } = useContext(ContextApp);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  return <section className={`hero shell ${query ? "hero-results" : ""}`} aria-labelledby="hero-heading">
    <div className="hero-copy">
      <span className="hero-intro"><span aria-hidden="true" />Your photo workspace</span>
      <h1 id="hero-heading">{query ? "Search photos" : <>Find, edit, and<br /><span>save photos.</span></>}</h1>
      <p>Photos for your next project.</p>
      <form className="search-form" role="search" onSubmit={(event) => { event.preventDefault(); search(); }}>
        <FiSearch aria-hidden="true" />
        <label className="sr-only" htmlFor="photo-search">Search photos</label>
        <input id="photo-search" type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search photos" autoComplete="off" maxLength={200} />
        {draft && <button type="button" className="search-clear icon-button" aria-label="Clear search text" onClick={() => setDraft("")}><FiX /></button>}
        <button className="button" type="submit"><span>Search</span><FiArrowUpRight aria-hidden="true" /></button>
      </form>
      <div className="suggestions"><span>Try:</span><button onClick={() => search("mountains")}>Mountains</button><button onClick={() => search("street photography")}>Street photography</button><button onClick={() => search("beaches")}>Beaches</button></div>
    </div>
    <button className="featured-toggle" aria-expanded={featuredOpen} aria-controls="featured-photo" onClick={() => setFeaturedOpen((open) => !open)}><FiImage aria-hidden="true" />{featuredOpen ? "Hide featured photo" : "View featured photo"}<FiChevronDown aria-hidden="true" /></button>
    <div id="featured-photo" className={`hero-art ${featuredOpen ? "is-expanded" : ""}`}>
      <div className="hero-photo-main">
        <img src="https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1000" width="1000" height="667" alt="Sunlit mountains reflected in a turquoise lake" fetchpriority="high" />
        <div className="hero-art-shade" />
        <span className="hero-label">Featured photo</span>
        <a className="hero-credit" href="https://www.pexels.com/photo/417074/" target="_blank" rel="noreferrer">Photo by Pixabay / Pexels ↗</a>
      </div>
      <div className="hero-photo-side">
        <button onClick={() => search("architecture")} aria-label="Explore architecture photos"><img src="https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=360" width="360" height="240" alt="" loading="lazy" /><span>Architecture<FiArrowUpRight aria-hidden="true" /></span></button>
        <button onClick={() => search("interiors")} aria-label="Explore interior photos"><img src="https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=360" width="360" height="240" alt="" loading="lazy" /><span>Interiors<FiArrowUpRight aria-hidden="true" /></span></button>
        <a className="hero-source" href="https://www.pexels.com" target="_blank" rel="noreferrer">Photos: Pexels <FiArrowUpRight aria-hidden="true" /></a>
      </div>
    </div>
    <div className="category-bar" aria-label="Photo categories">
      <button className={!query ? "selected" : ""} aria-pressed={!query} onClick={() => search("")}>All photos</button>
      {categories.map((category) => <button key={category} className={query.toLowerCase() === category.toLowerCase() ? "selected" : ""}
        aria-pressed={query.toLowerCase() === category.toLowerCase()} onClick={() => search(category)}>{category}</button>)}
    </div>
  </section>;
}
