import { useContext } from "react";
import { FiAperture, FiCompass, FiHeart, FiFolder, FiSun, FiMoon, FiGrid } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { StudioContext } from "../Studio/StudioContext";

export default function Header() {
  const { view, navigate, favorites, collections, theme, toggleTheme } = useContext(ContextApp);
  const { boards } = useContext(StudioContext);
  return <header className="site-header">
    <div className="header-inner shell">
      <div className="brand-block"><button className="brand" onClick={() => navigate("explore")} aria-label="Photo Lab home">
        <span className="brand-mark"><FiAperture /></span><span>photo<span className="brand-light">lab</span><span className="brand-dot">.</span></span>
      </button></div>
      <nav className="main-nav" aria-label="Main navigation">
        {[{ id: "explore", label: "Explore", icon: FiCompass }, { id: "favorites", label: "Favorites", icon: FiHeart, count: favorites.length },
          { id: "collections", label: "Collections", icon: FiFolder, count: collections.length },
          { id: "moodboards", label: "Moodboards", icon: FiGrid, count: boards.length }].map(({ id, label, icon: Icon, count }) =>
          <button key={id} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}>
            <Icon aria-hidden="true" /><span>{label}</span>{count > 0 && <span className="nav-count">{count}</span>}
          </button>)}
      </nav>
      <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
        {theme === "light" ? <FiMoon /> : <FiSun />}
      </button>
    </div>
  </header>;
}
