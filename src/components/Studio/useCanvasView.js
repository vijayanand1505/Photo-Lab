import { useLayoutEffect, useRef, useState } from "react";
import { clamp } from "./model";

export default function useCanvasView() {
  const viewport = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const anchor = useRef(null);
  const drag = useRef(null);
  const changeZoom = (next) => {
    const value = clamp(next, 1, 3), node = viewport.current;
    if (value === zoom) return;
    if (node) anchor.current = { x: (node.scrollLeft + node.clientWidth / 2) / zoom, y: (node.scrollTop + node.clientHeight / 2) / zoom };
    setZoom(value);
  };
  useLayoutEffect(() => {
    const node = viewport.current;
    if (node && anchor.current) {
      node.scrollLeft = anchor.current.x * zoom - node.clientWidth / 2;
      node.scrollTop = anchor.current.y * zoom - node.clientHeight / 2;
      anchor.current = null;
    }
  }, [zoom]);
  const fit = () => {
    anchor.current = null; setZoom(1); setPanning(false);
    if (viewport.current) { viewport.current.scrollLeft = 0; viewport.current.scrollTop = 0; }
  };
  const stopPan = (event) => {
    if (!drag.current || drag.current.pointer !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return { viewport, zoom, panning, changeZoom, fit, setPanning, panHandlers: {
    onPointerDownCapture: (event) => {
      if (!panning || event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const node = viewport.current;
      drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
      node.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event) => {
      if (!drag.current || drag.current.pointer !== event.pointerId) return;
      const previous = drag.current;
      viewport.current.scrollLeft = previous.left - (event.clientX - previous.x);
      viewport.current.scrollTop = previous.top - (event.clientY - previous.y);
    },
    onPointerUp: stopPan, onPointerCancel: stopPan, onLostPointerCapture: stopPan,
  } };
}
