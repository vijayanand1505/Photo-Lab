import { useCallback, useEffect, useRef, useState } from "react";

const UNDO_WINDOW = 12000;

export default function useUndoActions(notify) {
  const [actions, setActions] = useState([]);
  const [paused, setPaused] = useState(false);
  const holds = useRef(new Set());
  const pausedAt = useRef(null);
  const sequence = useRef(0);
  const offerUndo = useCallback((message, restore) => {
    const action = { id: ++sequence.current, message, restore, expires: Date.now() + UNDO_WINDOW };
    setActions((previous) => [...previous, action].slice(-10));
  }, []);
  const holdUndo = useCallback((reason, hold) => {
    if (hold) holds.current.add(reason); else holds.current.delete(reason);
    if (holds.current.size && pausedAt.current === null) {
      pausedAt.current = Date.now(); setPaused(true);
    } else if (!holds.current.size && pausedAt.current !== null) {
      const elapsed = Date.now() - pausedAt.current;
      pausedAt.current = null;
      setActions((previous) => previous.map((action) => ({ ...action, expires: action.expires + elapsed })));
      setPaused(false);
    }
  }, []);
  useEffect(() => {
    if (!actions.length) { holds.current.clear(); pausedAt.current = null; setPaused(false); }
    if (paused || !actions.length) return;
    const nextExpiry = Math.min(...actions.map((action) => action.expires));
    const timer = setTimeout(() => setActions((previous) => previous.filter((action) => action.expires > Date.now())), Math.max(0, nextExpiry - Date.now()));
    return () => clearTimeout(timer);
  }, [actions, paused]);
  const latest = actions[actions.length - 1];
  const undoRemoval = () => {
    if (!latest || latest.restore() === false) return;
    setActions((previous) => previous.filter((action) => action.id !== latest.id));
    notify("Restored", "success");
  };
  return { undoNotice: latest, offerUndo, undoRemoval, holdUndo, dismissUndo: () => setActions((previous) => previous.slice(0, -1)) };
}
