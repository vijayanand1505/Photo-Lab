import { createContext, useCallback, useRef, useState } from "react";
import { usePersistentState } from "../../utils/storage";
import { addBoardPhotos, createBoard, validBoards, validDrafts } from "./model";

export const StudioContext = createContext();
export default function StudioProvider({ children, notify, offerUndo }) {
  const [boards, setBoards, boardsSaveStatus] = usePersistentState("photo-lab:boards", [], validBoards, notify);
  const [drafts, setDrafts, draftsSaveStatus] = usePersistentState("photo-lab:edit-drafts", {}, validDrafts, notify);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [editorPhoto, setEditorPhoto] = useState(null);
  const [editorPickerOpen, setEditorPickerOpen] = useState(false);
  const [actionPhoto, setActionPhoto] = useState(null);
  const [boardPhoto, setBoardPhoto] = useState(null);
  const [comparedPhotos, setComparedPhotos] = useState([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [boardCreatorOpen, setBoardCreatorOpen] = useState(false);
  const boardEditors = useRef(new Map());
  const boardsRef = useRef(boards);
  const comparisonRef = useRef(comparedPhotos);
  boardsRef.current = boards; comparisonRef.current = comparedPhotos;
  const registerBoardEditor = useCallback((id, apply) => {
    boardEditors.current.set(id, apply);
    return () => { if (boardEditors.current.get(id) === apply) boardEditors.current.delete(id); };
  }, []);
  const restoreBoardItem = (id, item, index) => {
    const board = boardsRef.current.find((entry) => entry.id === id);
    if (!board) { notify("Restore the deleted moodboard first, then undo this removal."); return false; }
    if (board.items.some((entry) => entry.id === item.id)) return;
    if (board.items.length >= 24) { notify("Remove a photo to make room, then try Undo again."); return false; }
    const restore = (previous) => {
      if (previous.items.some((entry) => entry.id === item.id) || previous.items.length >= 24) return previous;
      const items = [...previous.items]; items.splice(Math.min(index, items.length), 0, item); return { ...previous, items };
    };
    const apply = boardEditors.current.get(id);
    if (apply) apply(restore);
    else setBoards((previous) => previous.map((entry) => entry.id === id ? restore(entry) : entry));
  };
  const deleteBoard = (id) => {
    const index = boards.findIndex((board) => board.id === id), removed = boards[index];
    if (!removed) return;
    setBoards((previous) => previous.filter((board) => board.id !== id)); setActiveBoardId(null);
    offerUndo(`Deleted ${removed.name || "moodboard"}`, () => setBoards((previous) => {
      if (previous.some((board) => board.id === id)) return previous;
      const next = [...previous]; next.splice(Math.min(index, next.length), 0, removed); return next;
    }));
  };

  const newBoard = (name, photos = []) => {
    const board = createBoard(name, photos);
    setBoards((previous) => [...previous, board]);
    return board.id;
  };
  const updateBoard = useCallback((board) => setBoards((previous) => {
    if (previous.find((item) => item.id === board.id) === board) return previous;
    return previous.map((item) => item.id === board.id ? board : item);
  }), [setBoards]);
  const saveDraft = useCallback((id, edit) => setDrafts((previous) => {
    if (JSON.stringify(previous[id]) === JSON.stringify(edit)) return previous;
    const entries = Object.entries(previous).filter(([key]) => key !== String(id)).slice(-11);
    return Object.fromEntries([...entries, [String(id), edit]]);
  }), [setDrafts]);
  const toggleCompare = (photo) => {
    const exists = comparedPhotos.some((item) => item.id === photo.id);
    if (!exists && comparedPhotos.length >= 4) { notify("You can compare up to four photos. Remove one to add another."); return; }
    setComparedPhotos((previous) => exists ? previous.filter((item) => item.id !== photo.id) : [...previous, photo]);
    if (exists) {
      const index = comparedPhotos.findIndex((item) => item.id === photo.id);
      offerUndo("Removed from comparison", () => {
        if (comparisonRef.current.some((item) => item.id === photo.id)) return;
        if (comparisonRef.current.length >= 4) { notify("Remove a comparison photo to make room, then try Undo again."); return false; }
        setComparedPhotos((previous) => { const next = [...previous]; next.splice(Math.min(index, next.length), 0, photo); return next; });
      });
    }
  };
  const addComparison = (photos) => setComparedPhotos((previous) => [...new Map([...previous, ...photos].map((photo) => [photo.id, photo])).values()].slice(0, 4));
  const clearComparison = () => {
    if (!comparedPhotos.length) return;
    const removed = [...comparedPhotos];
    setComparedPhotos([]);
    offerUndo("Comparison selection cleared", () => {
      const restored = [...new Map([...comparisonRef.current, ...removed].map((photo) => [photo.id, photo])).values()];
      if (restored.length > 4) { notify("Clear room in the comparison before restoring these photos."); return false; }
      setComparedPhotos(restored);
    });
  };
  const addToBoard = (id, photos) => {
    const board = boards.find((item) => item.id === id);
    if (!board) return;
    if (board.items.length >= 24) { notify("This board has 24 photos. Remove one before adding another."); return; }
    updateBoard(addBoardPhotos(board, photos));
    notify(`Added to ${board.name}`);
  };
  return <StudioContext.Provider value={{
    boards, activeBoardId, setActiveBoardId, activeBoard: boards.find((board) => board.id === activeBoardId), newBoard, updateBoard, addToBoard, boardCreatorOpen, setBoardCreatorOpen,
    deleteBoard, registerBoardEditor, restoreBoardItem,
    drafts, saveDraft, boardsSaveStatus, draftsSaveStatus, editorPhoto, setEditorPhoto, editorPickerOpen, setEditorPickerOpen, actionPhoto, setActionPhoto, boardPhoto, setBoardPhoto,
    comparedPhotos, toggleCompare, addComparison, clearComparison, comparisonOpen, setComparisonOpen,
  }}>{children}</StudioContext.Provider>;
}
