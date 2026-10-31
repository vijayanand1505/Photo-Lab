import { cloneElement, useId, useState } from "react";

export default function Tooltip({ label, children }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className="tooltip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDownCapture={(event) => {
    if (open && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
  }}>
    {cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], id].filter(Boolean).join(" ") })}
    <span className="tooltip-label" id={id} role="tooltip" hidden={!open}>{label}</span>
  </span>;
}
