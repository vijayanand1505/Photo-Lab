import { useContext, useRef, useState } from "react";
import { FiChevronDown, FiSliders, FiX } from "react-icons/fi";
import { ContextApp } from "../../utils/Context";
import { EMPTY_FILTERS } from "../../utils/Api";

export const COLORS = [
  { name: "Red", value: "red", hex: "#d76b62" }, { name: "Orange", value: "orange", hex: "#e6a362" },
  { name: "Yellow", value: "yellow", hex: "#e4ca66" }, { name: "Green", value: "green", hex: "#709b74" },
  { name: "Blue", value: "blue", hex: "#719ed0" }, { name: "Violet", value: "violet", hex: "#a68ac7" },
  { name: "White", value: "white", hex: "#ffffff" }, { name: "Black", value: "black", hex: "#29322f" },
];
export default function Filters() {
  const { filters, changeFilters, query } = useContext(ContextApp);
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef(null);
  const closePanel = () => { setExpanded(false); toggle.current?.focus(); };
  const active = Object.entries(filters).filter(([, value]) => value);
  const extraCount = [filters.size, filters.color].filter(Boolean).length;
  const change = (key, value) => changeFilters({ ...filters, [key]: value });
  return <div className="filters-wrap">
    <div className="filters-toolbar" aria-label="Filter photos">
      <label className="filter-select"><span className="sr-only">Orientation</span>
        <select aria-label="Orientation" value={filters.orientation} onChange={(event) => change("orientation", event.target.value)}>
          <option value="">All orientations</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option><option value="square">Square</option>
        </select>
      </label>
      <button ref={toggle} className="filters-toggle button button-secondary" type="button" aria-expanded={expanded} aria-controls="additional-filters" onClick={() => setExpanded((open) => !open)}><FiSliders aria-hidden="true" /> Filters{extraCount > 0 && <span className="filter-count">{extraCount}<span className="sr-only"> active</span></span>}<FiChevronDown aria-hidden="true" /></button>
    </div>
    <div id="additional-filters" className="filters-panel" hidden={!expanded} onKeyDown={(event) => { if (event.key === "Escape") closePanel(); }}>
      <label className="filter-select"><span>Image size</span>
        <select aria-label="Image size" value={filters.size} onChange={(event) => change("size", event.target.value)}>
          <option value="">All sizes</option><option value="large">Large · 24 MP+</option><option value="medium">Medium · 12 MP+</option><option value="small">Small · 4 MP+</option>
        </select>
      </label>
      <fieldset className="color-filters"><legend className="sr-only">Photo color</legend><span aria-hidden="true">Color</span>
        {COLORS.map((color) => <button type="button" key={color.value} className={`color-swatch ${filters.color === color.value ? "is-selected" : ""}`}
          style={{ "--swatch": color.hex }} aria-label={`Filter by ${color.name.toLowerCase()}`} aria-pressed={filters.color === color.value}
          title={color.name} onClick={() => change("color", filters.color === color.value ? "" : color.value)} />)}
      </fieldset>
      <button className="text-button filters-done" onClick={closePanel}>Done</button>
    </div>
    {active.length > 0 && <div className="active-filters">
      {active.map(([key, value]) => <button key={key} className="filter-chip" onClick={() => change(key, "")} aria-label={`Remove ${key} filter: ${value}`}>
        <span>{key}: {value}</span><FiX aria-hidden="true" /></button>)}
      <button className="text-button" onClick={() => changeFilters({ ...EMPTY_FILTERS })}>Clear all</button>
      {!query && <span className="filter-hint">Showing nature photos. Search for a different subject.</span>}
    </div>}
  </div>;
}
