import { act, fireEvent, renderHook } from "@testing-library/react";
import useBrowsePosition from "./useBrowsePosition";

test("each screen restores its own position and a new search starts at the top", () => {
  jest.useFakeTimers();
  const scrollDescriptor = Object.getOwnPropertyDescriptor(window, "scrollY");
  const heightDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, "scrollHeight");
  let position = 0;
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => position });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => 6000 });
  window.scrollTo.mockImplementation(({ top }) => { position = top; });
  const { rerender, unmount } = renderHook(({ screen }) => useBrowsePosition(screen), { initialProps: { screen: "explore:0" } });
  try {
    act(() => jest.advanceTimersByTime(40));
    act(() => { position = 1200; fireEvent.scroll(window); });
    rerender({ screen: "favorites" });
    expect(position).toBe(0);
    act(() => jest.advanceTimersByTime(40));
    act(() => { position = 200; fireEvent.scroll(window); });
    rerender({ screen: "explore:0" });
    expect(position).toBe(1200);
    act(() => jest.advanceTimersByTime(40));
    rerender({ screen: "favorites" });
    expect(position).toBe(200);
    act(() => jest.advanceTimersByTime(40));
    rerender({ screen: "explore:1" });
    expect(position).toBe(0);
  } finally {
    unmount();
    if (scrollDescriptor) Object.defineProperty(window, "scrollY", scrollDescriptor);
    if (heightDescriptor) Object.defineProperty(document.documentElement, "scrollHeight", heightDescriptor);
    else delete document.documentElement.scrollHeight;
    window.scrollTo.mockReset();
    jest.useRealTimers();
  }
});
