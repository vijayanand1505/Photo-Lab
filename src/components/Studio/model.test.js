import { addBoardPhotos, adjustPixels, boundItem, createBoard, cropToRatio, DEFAULT_EDIT, editGeometry, layoutBoard, validBoards, validDrafts } from "./model";
import { historyReducer, historyShortcut } from "./useHistory";

const photo = { id: 1, width: 400, height: 300, photographer: "Artist", src: { original: "https://images.pexels.com/photos/1/photo.jpeg" } };

test("crop geometry centers a requested ratio and accounts for rotation and export limits", () => {
  expect(cropToRatio(400, 300, 1)).toEqual({ x: 12.5, y: 0, width: 75, height: 100 });
  expect(cropToRatio(400, 300, 0)).toEqual(DEFAULT_EDIT.crop);
  const geometry = editGeometry(4000, 3000, { ...DEFAULT_EDIT, rotation: 90, crop: { x: 25, y: 0, width: 50, height: 100 } }, 1000);
  expect(geometry.source).toEqual({ x: 1000, y: 0, width: 2000, height: 3000 });
  expect(geometry.width).toBe(1000);
  expect(geometry.height).toBe(667);
});

test("adjustments change actual pixels while preserving alpha", () => {
  const original = new Uint8ClampedArray([255, 0, 0, 255, 20, 100, 200, 127]);
  expect(adjustPixels(original.slice(), DEFAULT_EDIT)).toEqual(original);
  const monochrome = adjustPixels(original.slice(), { ...DEFAULT_EDIT, saturation: 0 });
  expect([...monochrome.slice(0, 4)]).toEqual([54, 54, 54, 255]);
  expect([...adjustPixels(original.slice(), { ...DEFAULT_EDIT, contrast: 0 }).slice(4)]).toEqual([128, 128, 128, 127]);
  expect([...adjustPixels(original.slice(), { ...DEFAULT_EDIT, brightness: 0 }).slice(0, 4)]).toEqual([0, 0, 0, 255]);
});

test.each([1, 2, 5, 12, 24])("both layout templates keep %s photos inside the board", (count) => {
  const board = createBoard("Ideas", Array.from({ length: count }, () => photo));
  expect(validBoards([board])).toBe(true);
  ["grid", "collage"].forEach((layout) => {
    const arranged = layoutBoard(board, layout);
    expect(validBoards([arranged])).toBe(true);
    expect(arranged.items).toHaveLength(count);
    expect(new Set(arranged.items.map((item) => item.id)).size).toBe(count);
  });
});

test("board boundaries and photo limits hold even for extreme transformations", () => {
  const board = createBoard("Ideas");
  expect(boundItem({ x: -200, y: 2000, width: 3000, height: 1 }, board)).toEqual({ x: 0, y: 920, width: 1600, height: 80 });
  const filled = addBoardPhotos(board, Array(30).fill(photo));
  expect(filled.items).toHaveLength(24);
  expect(addBoardPhotos(filled, [photo]).items).toHaveLength(24);
});

test("transactions group drag or slider changes into one undo step and new edits discard redo", () => {
  let state = { past: [], present: { x: 0 }, future: [], transaction: null };
  for (const action of [{ type: "begin" }, { type: "set", value: { x: 10 } }, { type: "set", value: { x: 20 } }, { type: "commit" }]) state = historyReducer(state, action);
  expect(state.past).toEqual([{ x: 0 }]);
  state = historyReducer(state, { type: "undo" });
  expect(state.present).toEqual({ x: 0 });
  state = historyReducer(state, { type: "redo" });
  expect(state.present).toEqual({ x: 20 });
  state = historyReducer(state, { type: "undo" });
  state = historyReducer(state, { type: "set", value: { x: 5 } });
  expect(state.future).toEqual([]);
});

test("invalid saved boards and editor drafts are rejected", () => {
  expect(validBoards([{ bad: true }])).toBe(false);
  expect(validDrafts({ 1: DEFAULT_EDIT })).toBe(true);
  expect(validDrafts({ 1: { ...DEFAULT_EDIT, rotation: 12 } })).toBe(false);
  expect(validDrafts({ 1: { ...DEFAULT_EDIT, crop: { x: 90, y: 0, width: 100, height: 100 } } })).toBe(false);
});

test("undo shortcuts work from adjustment sliders and preserve native text editing", () => {
  const history = { undo: jest.fn(), redo: jest.fn() };
  const event = { ctrlKey: true, key: "z", target: { tagName: "INPUT", type: "range" }, preventDefault: jest.fn() };
  historyShortcut(event, history);
  expect(history.undo).toHaveBeenCalledTimes(1);
  historyShortcut({ ...event, shiftKey: true, target: { tagName: "SELECT" } }, history);
  expect(history.redo).toHaveBeenCalledTimes(1);
  historyShortcut({ ...event, target: { tagName: "INPUT", type: "text" } }, history);
  expect(history.undo).toHaveBeenCalledTimes(1);
});
