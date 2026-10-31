import { useCallback, useReducer } from "react";

export function historyReducer(state, action) {
  const finish = (value) => value.transaction === null ? value : {
    ...value, past: JSON.stringify(value.transaction) === JSON.stringify(value.present) ? value.past : [...value.past, value.transaction].slice(-60), transaction: null,
  };
  if (action.type === "begin") return state.transaction === null ? { ...state, transaction: state.present } : state;
  if (action.type === "commit") return finish(state);
  if (action.type === "set") {
    const next = typeof action.value === "function" ? action.value(state.present) : action.value;
    if (JSON.stringify(next) === JSON.stringify(state.present)) return state;
    return { ...state, present: next, future: [], past: state.transaction === null ? [...state.past, state.present].slice(-60) : state.past };
  }
  const current = finish(state);
  if (action.type === "undo" && current.past.length) return {
    past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future], transaction: null,
  };
  if (action.type === "redo" && current.future.length) return {
    past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1), transaction: null,
  };
  return current;
}

export default function useHistory(initial) {
  const [state, dispatch] = useReducer(historyReducer, { past: [], present: initial, future: [], transaction: null });
  return {
    value: state.present, canUndo: state.past.length > 0 || state.transaction !== null, canRedo: state.future.length > 0,
    set: useCallback((value) => dispatch({ type: "set", value }), []),
    begin: useCallback(() => dispatch({ type: "begin" }), []), commit: useCallback(() => dispatch({ type: "commit" }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []), redo: useCallback(() => dispatch({ type: "redo" }), []),
  };
}

export function historyShortcut(event, history) {
  if (event.target.tagName === "TEXTAREA" || (event.target.tagName === "INPUT" && !["range", "color", "checkbox"].includes(event.target.type))) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) history.redo(); else history.undo();
  }
}
