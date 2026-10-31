import { act, renderHook } from "@testing-library/react";
import useUndoActions from "./useUndoActions";

afterEach(() => jest.useRealTimers());

test("successive removals can be restored independently", () => {
  const notify = jest.fn(), first = jest.fn(), second = jest.fn();
  const { result } = renderHook(() => useUndoActions(notify));
  act(() => { result.current.offerUndo("First", first); result.current.offerUndo("Second", second); });
  act(() => result.current.undoRemoval());
  expect(second).toHaveBeenCalledTimes(1);
  expect(result.current.undoNotice.message).toBe("First");
  act(() => result.current.undoRemoval());
  expect(first).toHaveBeenCalledTimes(1);
  expect(result.current.undoNotice).toBeUndefined();
});

test("undo expiry pauses while the notice is focused or hovered", () => {
  jest.useFakeTimers();
  const { result } = renderHook(() => useUndoActions(jest.fn()));
  act(() => result.current.offerUndo("Removed", jest.fn()));
  act(() => jest.advanceTimersByTime(10000));
  act(() => { result.current.holdUndo("focus", true); result.current.holdUndo("pointer", true); });
  act(() => jest.advanceTimersByTime(20000));
  act(() => result.current.holdUndo("pointer", false));
  act(() => jest.advanceTimersByTime(20000));
  expect(result.current.undoNotice).toBeDefined();
  act(() => result.current.holdUndo("focus", false));
  act(() => jest.advanceTimersByTime(2001));
  expect(result.current.undoNotice).toBeUndefined();
});

test("a restoration blocked by capacity stays available for another attempt", () => {
  const restore = jest.fn().mockReturnValueOnce(false);
  const { result } = renderHook(() => useUndoActions(jest.fn()));
  act(() => result.current.offerUndo("Removed", restore));
  act(() => result.current.undoRemoval());
  expect(result.current.undoNotice).toBeDefined();
  act(() => result.current.undoRemoval());
  expect(result.current.undoNotice).toBeUndefined();
});
