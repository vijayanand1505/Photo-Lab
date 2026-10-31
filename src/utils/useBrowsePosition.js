import { useEffect, useLayoutEffect, useRef } from "react";

// Each screen keeps its own position for the current app session.
export default function useBrowsePosition(screen) {
  const positions = useRef(new Map());
  const current = useRef(screen);
  const restoring = useRef(false);
  useEffect(() => {
    const remember = () => { if (!restoring.current && document.body.style.overflow !== "hidden") positions.current.set(current.current, window.scrollY); };
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("pointerdown", remember, true);
    window.addEventListener("keydown", remember, true);
    return () => {
      window.removeEventListener("scroll", remember);
      window.removeEventListener("pointerdown", remember, true);
      window.removeEventListener("keydown", remember, true);
    };
  }, []);
  useLayoutEffect(() => {
    current.current = screen;
    restoring.current = true;
    const target = positions.current.get(screen) || 0;
    let frame, settle, timeout, observer;
    const stop = () => {
      restoring.current = false;
      cancelAnimationFrame(frame); cancelAnimationFrame(settle); clearTimeout(timeout);
      observer?.disconnect();
    };
    const restore = () => {
      window.scrollTo({ top: target, left: 0, behavior: "instant" });
      if (document.documentElement.scrollHeight - window.innerHeight >= target) {
        cancelAnimationFrame(settle);
        settle = requestAnimationFrame(() => { window.scrollTo({ top: target, left: 0, behavior: "instant" }); stop(); });
      }
    };
    restore();
    frame = requestAnimationFrame(restore);
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => { if (restoring.current) restore(); });
      observer.observe(document.querySelector("main") || document.body);
    }
    timeout = setTimeout(stop, 2500);
    const interrupt = () => { stop(); positions.current.set(screen, window.scrollY); };
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    return () => {
      stop();
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
    };
  }, [screen]);
}
